use super::extension_buttons::TitlebarBadgeButton;
use crate::*;
use base64::Engine as _;
use serde_json::{Value, json};
use std::{
    sync::{Arc, OnceLock},
    time::Duration,
};

fn text<'a>(value: &'a Value, key: &str) -> &'a str {
    value.get(key).and_then(Value::as_str).unwrap_or("")
}

fn titlebar_entry(account: &Value, machine: &str) -> Value {
    let mut account = account.clone();
    let key = machine
        .as_bytes()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>();
    account["titlebarKey"] = json!(format!("account-{key}-{}", text(&account, "id")));
    account["titlebarMachine"] = json!(machine);
    account
}

fn icon(codex: bool) -> Arc<gpui::Image> {
    static CODEX: OnceLock<Arc<gpui::Image>> = OnceLock::new();
    static CLAUDE: OnceLock<Arc<gpui::Image>> = OnceLock::new();
    let (slot, bytes): (_, &[u8]) = if codex {
        (
            &CODEX,
            include_bytes!("../../../assets/account-usage/codex.svg"),
        )
    } else {
        (
            &CLAUDE,
            include_bytes!("../../../assets/account-usage/claude.svg"),
        )
    };
    slot.get_or_init(|| {
        Arc::new(gpui::Image::from_bytes(
            gpui::ImageFormat::Svg,
            bytes.to_vec(),
        ))
    })
    .clone()
}

fn popup_account(account: &Value) -> Value {
    let mut account = account.clone();
    let name = text(&account, "name");
    let hidden = shared_settings::shared_sidebar_settings_snapshot()
        .object()
        .get("hideAccountEmails")
        .and_then(Value::as_bool)
        == Some(true);
    let display = if hidden {
        match name.split_once('@') {
            Some((local, _)) => format!(
                "{}•••{}@••••••.•••",
                local.chars().next().unwrap_or('•'),
                local.chars().last().unwrap_or('•')
            ),
            None => name.to_string(),
        }
    } else {
        name.to_string()
    };
    account["displayName"] = json!(display);
    account
}

fn badge_lines(account: &Value) -> Vec<String> {
    let windows = account["usage"]
        .as_array()
        .map(Vec::as_slice)
        .unwrap_or(&[]);
    let pct = |w: &Value| w["usedPercent"].as_f64().map(|v| format!("{:.0}", v));
    if text(account, "provider") == "codex" {
        let main: Vec<_> = windows.iter().filter(|w| w["model"].is_null()).collect();
        let session = main
            .iter()
            .find(|w| w["limitWindowSeconds"].as_i64() == Some(18000));
        let weekly = main.iter().find(|w| {
            w["limitWindowSeconds"]
                .as_i64()
                .is_some_and(|s| s >= 604800)
        });
        let usage = [session, weekly]
            .into_iter()
            .flatten()
            .filter_map(|w| pct(w))
            .collect::<Vec<_>>();
        let mut lines = Vec::new();
        if !usage.is_empty() {
            lines.push(format!("{}%", usage.join("/")));
        }
        if let Some(resets) = account["resetCredits"].as_u64() {
            lines.push(format!("{resets} rs"));
        }
        lines
    } else {
        let weekly = windows.iter().find(|w| text(w, "id") == "sevenDay");
        let model = windows.iter().find(|w| w["model"].is_string());
        [weekly, model]
            .into_iter()
            .flatten()
            .filter_map(|w| pct(w).map(|v| format!("{v}%")))
            .collect()
    }
}

impl GhostexGpuiApp {
    pub(crate) fn update_titlebar_account_from_ui(
        &mut self,
        message: &Value,
        window: &mut Window,
        cx: &mut gpui::Context<Self>,
    ) {
        let machine = text(message, "machineId");
        let account = &message["account"];
        if machine != "local" && !self.remote_gxserver_connections.contains_key(machine) {
            return;
        }
        if !matches!(text(account, "provider"), "claude" | "codex") || account["registered"] != true
        {
            return;
        }
        let account = titlebar_entry(account, machine);
        let Some(id) = ExtensionId::new(text(&account, "titlebarKey")) else {
            return;
        };
        self.titlebar_accounts_revision = self.titlebar_accounts_revision.wrapping_add(1);
        self.titlebar_accounts
            .retain(|a| text(a, "titlebarKey") != id.as_str());
        if account["showInTitlebar"] == true {
            self.titlebar_accounts.push(account);
        } else if self
            .titlebar_extension_popup
            .as_ref()
            .is_some_and(|state| state.id == id)
        {
            self.close_titlebar_extension_popup(window, cx);
        }
        self.refresh_titlebar_accounts(cx);
        cx.notify();
    }

    pub(crate) fn start_titlebar_account_polling(&mut self, cx: &mut gpui::Context<Self>) {
        self.refresh_titlebar_accounts(cx);
        cx.spawn(async move |this, cx| {
            loop {
                cx.background_executor()
                    .timer(Duration::from_secs(30))
                    .await;
                if this
                    .update(cx, |this, cx| this.refresh_titlebar_accounts(cx))
                    .is_err()
                {
                    break;
                }
            }
        })
        .detach();
    }

    /// CDXC:AgentProviders 2026-09-08 WHY:
    /// All titlebar accounts share gxserver's cached cswap/xswap discovery. A popup owns no helper process, credentials, or network polling loop.
    pub(crate) fn refresh_titlebar_accounts(&mut self, cx: &mut gpui::Context<Self>) {
        if self.titlebar_accounts_refresh_in_flight {
            return;
        }
        self.titlebar_accounts_refresh_in_flight = true;
        let revision = self.titlebar_accounts_revision;
        let mut targets = vec![("local".to_string(), None)];
        targets.extend(
            self.remote_gxserver_connections
                .iter()
                .map(|(id, connection)| (id.clone(), Some(connection.request_target()))),
        );
        cx.spawn(async move |this, cx| {
            let results = cx.background_executor().spawn(async move {
                std::thread::scope(|scope| {
                    let tasks = targets.into_iter().map(|(machine, target)| scope.spawn(move || {
                        let params = json!({"operation":"titlebar"});
                        let result = match target {
                            Some(target) => gpui_remote_gxserver_rpc_result(&target, "/api/agentAccounts", &params, Duration::from_secs(60)),
                            None => gpui_gxserver_rpc_result("/api/agentAccounts", &params, Duration::from_secs(60)),
                        };
                        (machine, result)
                    })).collect::<Vec<_>>();
                    tasks.into_iter().filter_map(|task| task.join().ok()).collect::<Vec<_>>()
                })
            }).await;
            let _ = this.update_in(cx, |this, window, cx| {
                this.titlebar_accounts_refresh_in_flight = false;
                if this.titlebar_accounts_revision != revision {
                    this.refresh_titlebar_accounts(cx);
                    return;
                }
                for (machine, result) in results {
                    match result {
                        Ok(result) => {
                            this.titlebar_accounts.retain(|a| text(a, "titlebarMachine") != machine);
                            for account in result["accounts"].as_array().into_iter().flatten()
                                .filter(|a| a["registered"] == true && a["showInTitlebar"] == true) {
                                this.titlebar_accounts.push(titlebar_entry(account, &machine));
                            }
                        }
                        Err(_) => {
                            for account in this.titlebar_accounts.iter_mut().filter(|a| text(a, "titlebarMachine") == machine) {
                                account["usageError"] = json!("Could not refresh account usage. Showing the last received snapshot.");
                            }
                        }
                    }
                }
                this.titlebar_accounts.sort_by(|a, b| text(a,"titlebarMachine").cmp(text(b,"titlebarMachine"))
                    .then(text(a,"provider").cmp(text(b,"provider")))
                    .then(text(a,"selector").parse::<u64>().unwrap_or(0).cmp(&text(b,"selector").parse::<u64>().unwrap_or(0))));
                if let Some(state) = &this.titlebar_extension_popup {
                    if state.account {
                        if let Some(account) = this.titlebar_accounts.iter().find(|a| text(a,"titlebarKey") == state.id.as_str()) {
                            if let Some(panel) = state.panel.clone() {
                                let script = format!("window.ghostexUpdateAccountUsage?.({});", popup_account(account));
                                panel.update(cx, |panel, cx| panel.surface.update(cx, |surface, _| { surface.execute_app_owned_script(&script); }));
                            }
                        } else { this.close_titlebar_extension_popup(window, cx); }
                    }
                }
                cx.notify();
            });
        }).detach();
    }

    /// CDXC:AgentProviders 2026-09-08 DECISION:
    /// User: account usage buttons precede extensions, match their appearance and popup behavior, and identify each account at the top-left of its agent icon.
    pub(crate) fn render_titlebar_account_buttons(
        &self,
        window: &mut Window,
        cx: &mut gpui::Context<Self>,
    ) -> Vec<gpui::AnyElement> {
        self.titlebar_accounts
            .iter()
            .filter_map(|account| {
                let id = ExtensionId::new(text(account, "titlebarKey"))?;
                let codex = text(account, "provider") == "codex";
                let indicator = match text(account, "indicator") {
                    "" => text(account, "selector"),
                    value => value,
                };
                Some(
                    self.render_titlebar_badge_button(
                        TitlebarBadgeButton {
                            id,
                            title: format!(
                                "{} Usage · {}",
                                if codex { "Codex" } else { "Claude" },
                                text(&popup_account(account), "displayName")
                            ),
                            icon_image: icon(codex),
                            badge_lines: badge_lines(account),
                            indicator: (!indicator.is_empty() && indicator != "-")
                                .then(|| indicator.to_string()),
                            account: true,
                        },
                        window,
                        cx,
                    ),
                )
            })
            .collect()
    }

    pub(crate) fn open_titlebar_account_usage(
        &mut self,
        id: ExtensionId,
        trigger_bounds: Bounds<Pixels>,
        window: &mut Window,
        cx: &mut gpui::Context<Self>,
    ) {
        if self
            .titlebar_extension_popup
            .as_ref()
            .is_some_and(|state| state.id == id)
        {
            self.close_titlebar_extension_popup(window, cx);
            return;
        }
        let Some(account) = self
            .titlebar_accounts
            .iter()
            .find(|a| text(a, "titlebarKey") == id.as_str())
            .cloned()
        else {
            return;
        };
        self.set_gpui_titlebar_tips_panel_open(false, window, cx);
        self.set_gpui_titlebar_resources_panel_open(false, window, cx);
        self.close_titlebar_extension_popup(window, cx);
        self.titlebar_extension_popup_generation =
            self.titlebar_extension_popup_generation.wrapping_add(1);
        let generation = self.titlebar_extension_popup_generation;
        self.titlebar_dropdown_previous_focus_handle = window.focused(cx);
        self.titlebar_dropdown_focus_handle.focus(window, cx);
        self.titlebar_extension_popup = Some(GpuiTitlebarExtensionPopupState {
            id,
            account: true,
            trigger_bounds,
            size: GpuiExtensionPopupSize {
                width: 380.0,
                height: 560.0,
            },
            generation,
            panel: None,
            error: None,
        });
        let template = if text(&account, "provider") == "codex" {
            include_str!("../../../assets/account-usage/codex.html")
        } else {
            include_str!("../../../assets/account-usage/claude.html")
        };
        let script = include_str!("../../../assets/account-usage/popup.js").replace(
            "__ACCOUNT_JSON__",
            &popup_account(&account).to_string().replace('<', "\\u003c"),
        );
        let html = template.replace("__ACCOUNT_SCRIPT__", &script);
        let url = format!(
            "data:text/html;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(html)
        );
        let parent = self.parent_ns_view;
        let app = cx.entity().downgrade();
        let mut async_cx = cx.to_async();
        cx.foreground_executor()
            .spawn(async move {
                let result =
                    GpuiTitlebarExtensionPanel::create_browser(parent, id, &url, None, None);
                let _ = app.update_in(&mut async_cx, |this, _window, cx| {
                    this.attach_titlebar_extension_panel(generation, id, result, cx)
                });
            })
            .detach();
        cx.notify();
    }
}
