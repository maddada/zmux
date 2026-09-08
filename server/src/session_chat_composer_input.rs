use std::ops::Range;

use super::{is_horizontal_rule, is_titled_horizontal_rule, strip_ansi_sgr};

/// CDXC:SessionChat 2026-09-08 WHY:
/// Rewind restores wrapped drafts in both Claude and Codex. Claude's former three-row signature rejected those drafts before Send could clear them.
/// Readiness, rewind and replacement must agree on the whole input region, including empty and continued rows.
pub(super) fn rule_input_region(lines: &[String], marker: char) -> Option<Range<usize>> {
    let foot = lines.iter().rposition(|line| is_horizontal_rule(line))?;
    let head = lines[..foot]
        .iter()
        .rposition(|line| is_titled_horizontal_rule(line))?;
    let start = (head + 1..foot).find(|&i| !lines[i].trim().is_empty())?;
    lines[start]
        .trim_start()
        .starts_with(marker)
        .then_some(start..foot)
}

pub fn claude_composer_draft(screen: &str) -> Option<String> {
    let lines: Vec<_> = screen.lines().map(strip_ansi_sgr).collect();
    let region = rule_input_region(&lines, '❯')?;
    let text = lines[region.start].trim_start().strip_prefix('❯')?;
    Some(
        std::iter::once(text.trim())
            .chain(
                lines[region.start + 1..region.end]
                    .iter()
                    .map(|line| line.trim()),
            )
            .collect::<Vec<_>>()
            .join(" ")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" "),
    )
}

#[derive(Debug)]
pub struct SessionChatComposerInput {
    pub text: String,
    pub rows: usize,
    placeholder: bool,
}

impl SessionChatComposerInput {
    pub fn is_empty(&self) -> bool {
        self.text.trim().is_empty() || self.placeholder
    }
}

#[derive(Default, Clone, Copy)]
struct Style {
    bold: bool,
    faint: bool,
}

struct StyledLine {
    chars: Vec<(char, Style)>,
    text: String,
}

/// CDXC:SessionChat 2026-09-08 WHY:
/// Plain captures make Codex's empty placeholder indistinguishable from a draft. VT captures preserve its faint style and distinguish the live bold prompt from dim transcript echoes, without depending on placeholder wording.
fn styled_lines(screen: &str) -> Vec<StyledLine> {
    let mut style = Style::default();
    screen
        .lines()
        .map(|line| {
            let mut chars = line.chars().peekable();
            let mut visible = Vec::new();
            while let Some(ch) = chars.next() {
                if ch != '\u{1b}' {
                    visible.push((ch, style));
                    continue;
                }
                if chars.next() != Some('[') {
                    continue;
                }
                let mut parameters = String::new();
                for next in chars.by_ref() {
                    if ('@'..='~').contains(&next) {
                        if next == 'm' {
                            let values: Vec<_> = parameters
                                .split(';')
                                .map(|p| p.parse::<u16>().unwrap_or(0))
                                .collect();
                            let mut index = 0;
                            while index < values.len() {
                                match values[index] {
                                    0 => style = Style::default(),
                                    1 => style.bold = true,
                                    2 => style.faint = true,
                                    22 => {
                                        style.bold = false;
                                        style.faint = false;
                                    }
                                    38 | 48 | 58 => {
                                        index += match values.get(index + 1) {
                                            Some(2) => 4,
                                            Some(5) => 2,
                                            _ => 0,
                                        };
                                    }
                                    _ => {}
                                }
                                index += 1;
                            }
                        }
                        break;
                    }
                    parameters.push(next);
                }
            }
            StyledLine {
                text: visible.iter().map(|(ch, _)| *ch).collect(),
                chars: visible,
            }
        })
        .collect()
}

/// Input only, excluding transcript and footer. Call with a VT capture when proving a draft empty.
pub fn session_chat_composer_input(agent: &str, screen: &str) -> Option<SessionChatComposerInput> {
    if agent == "grok" {
        return super::grok_composer_draft(screen).map(|text| SessionChatComposerInput {
            text,
            rows: 1,
            placeholder: false,
        });
    }
    let lines = styled_lines(screen);
    let plain: Vec<_> = lines.iter().map(|line| line.text.clone()).collect();
    let region = match agent {
        "claude" | "openclaude" => rule_input_region(&plain, '❯')?,
        "codex" => {
            let start = lines.iter().rposition(|line| {
                line.chars
                    .iter()
                    .find(|(ch, _)| !ch.is_whitespace())
                    .is_some_and(|(ch, style)| {
                        matches!(ch, '›' | '»') && style.bold && !style.faint
                    })
            })?;
            let last = (start + 1..lines.len()).rfind(|&i| !plain[i].trim().is_empty())?;
            let foot = (start + 1..last).rfind(|&i| plain[i].trim().is_empty())?;
            start..foot
        }
        _ => return None,
    };
    let first = &lines[region.start];
    let marker = first.chars.iter().position(|(ch, _)| !ch.is_whitespace())?;
    let body: Vec<_> = first.chars[marker + 1..]
        .iter()
        .chain(
            lines[region.start + 1..region.end]
                .iter()
                .flat_map(|line| line.chars.iter()),
        )
        .filter(|(ch, _)| !ch.is_whitespace())
        .collect();
    let text = std::iter::once(
        first.chars[marker + 1..]
            .iter()
            .map(|(ch, _)| *ch)
            .collect::<String>(),
    )
    .chain(
        plain[region.start + 1..region.end]
            .iter()
            .map(|line| line.trim_end().to_string()),
    )
    .collect::<Vec<_>>()
    .join("\n")
    .trim()
    .to_string();
    let placeholder = !body.is_empty()
        && body.iter().all(|(_, style)| style.faint)
        && !text.to_lowercase().contains("[paste");
    Some(SessionChatComposerInput {
        text,
        rows: region.len(),
        placeholder,
    })
}
