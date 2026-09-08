use super::scripts::shell_quote;

/// CDXC:AgentProviders 2026-09-08 DECISION:
/// User: if launching Grok installs an update and exits, start it again.
/// Grok returns success for both a normal quit and a completed update, so only its final update-completed line authorizes one relaunch with the same command and arguments.
/// Keep the CLI attached directly to its terminal; piping its output through tee would change TTY detection and input ownership.
pub(super) fn restart_after_update(startup: &str, zmx_bin: &str, session: &str) -> String {
    let startup = startup.trim_end_matches(['\r', '\n']);
    format!(
        r#"(
printf '%s\n' 'Starting Grok...'
if (
{startup}
); then
  for ghostex_grok_check in 1 2 3; do
    ghostex_grok_last_line=$(env -u ZMX_SESSION -u ZMX_SESSION_PREFIX {zmx_bin} history --screen {session} | awk 'NF {{ last = $0 }} END {{ gsub(/\r/, "", last); sub(/[ \t]+$/, "", last); print last }}')
    if [ "$ghostex_grok_last_line" = 'Update installed. Run `grok` to start.' ]; then
      printf '%s\n' 'Restarting Grok after its update...'
      {startup}
      exit $?
    fi
    sleep 0.05
  done
else
  exit $?
fi
)"#,
        zmx_bin = shell_quote(zmx_bin),
        session = shell_quote(session),
    )
}
