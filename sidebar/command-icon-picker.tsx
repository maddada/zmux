import { IconChevronDown } from "@tabler/icons-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SIDEBAR_COMMAND_ICON_COLOR,
  getSidebarCommandIconLabel,
  normalizeSidebarCommandIconColor,
  type SidebarCommandIcon,
} from "../shared/sidebar-command-icons";
import { SIDEBAR_COMMAND_ICON_OPTIONS, SidebarCommandIconGlyph } from "./sidebar-command-icon";

export type CommandIconPickerProps = {
  icon?: SidebarCommandIcon;
  iconColor: string;
  onIconChange: (icon: SidebarCommandIcon | undefined) => void;
  onIconColorChange: (iconColor: string) => void;
};

export function CommandIconPicker({
  icon,
  iconColor,
  onIconChange,
  onIconColorChange,
}: CommandIconPickerProps) {
  const [colorText, setColorText] = useState(iconColor);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const labelId = useId();
  const listboxId = useId();
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isColorDisabled = icon === undefined;

  const filteredOptions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (trimmedQuery.length === 0) {
      return SIDEBAR_COMMAND_ICON_OPTIONS;
    }

    return SIDEBAR_COMMAND_ICON_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(trimmedQuery),
    );
  }, [query]);

  useEffect(() => {
    setColorText(iconColor);
  }, [iconColor]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && pickerRef.current?.contains(event.target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const commitColorText = () => {
    const normalizedColor = normalizeSidebarCommandIconColor(colorText);
    if (!normalizedColor) {
      setColorText(iconColor);
      return;
    }

    if (normalizedColor !== iconColor) {
      onIconColorChange(normalizedColor);
    }
    setColorText(normalizedColor);
  };

  return (
    <div className="command-icon-picker-fields">
      <div className="command-config-field command-icon-picker-field" ref={pickerRef}>
        <span className="command-config-label" id={labelId}>
          Icon
        </span>
        <div className="command-icon-picker-dropdown">
          <button
            aria-controls={listboxId}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-labelledby={labelId}
            className="group-title-input command-config-input command-icon-picker-trigger"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            <span className="command-icon-picker-trigger-value">
              {icon ? (
                <>
                  <span aria-hidden="true" className="command-button-icon-shell">
                    <SidebarCommandIconGlyph
                      className="command-button-leading-icon"
                      color={iconColor}
                      icon={icon}
                      size={16}
                    />
                  </span>
                  <span>{getSidebarCommandIconLabel(icon)}</span>
                </>
              ) : (
                <span className="command-icon-picker-none-label">No icon</span>
              )}
            </span>
            <IconChevronDown
              aria-hidden="true"
              className="command-icon-picker-trigger-chevron"
              size={16}
            />
          </button>
          {isOpen ? (
            <div
              aria-labelledby={labelId}
              className="command-icon-picker-menu scroll-mask-y"
              id={listboxId}
              role="listbox"
            >
              <input
                aria-label="Filter icons"
                className="group-title-input command-config-input command-icon-picker-search"
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") {
                    event.stopPropagation();
                  }
                }}
                placeholder="Search icons"
                ref={searchInputRef}
                spellCheck={false}
                value={query}
              />
              <button
                aria-selected={icon === undefined}
                className="command-icon-picker-option"
                data-selected={String(icon === undefined)}
                onClick={() => {
                  onIconChange(undefined);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="command-icon-picker-option-copy">No icon</span>
              </button>
              {filteredOptions.map((option) => (
                <button
                  aria-selected={icon === option.icon}
                  className="command-icon-picker-option"
                  data-selected={String(icon === option.icon)}
                  key={option.icon}
                  onClick={() => {
                    onIconChange(option.icon);
                    if (!normalizeSidebarCommandIconColor(colorText)) {
                      onIconColorChange(DEFAULT_SIDEBAR_COMMAND_ICON_COLOR);
                      setColorText(DEFAULT_SIDEBAR_COMMAND_ICON_COLOR);
                    }
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span aria-hidden="true" className="command-button-icon-shell">
                    <SidebarCommandIconGlyph
                      className="command-button-leading-icon"
                      color={icon === option.icon ? iconColor : DEFAULT_SIDEBAR_COMMAND_ICON_COLOR}
                      icon={option.icon}
                      size={16}
                    />
                  </span>
                  <span className="command-icon-picker-option-copy">{option.label}</span>
                </button>
              ))}
              {filteredOptions.length === 0 ? (
                <div className="command-icon-picker-empty-state">No matching icons</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <label className="command-config-field">
        <span className="command-config-label">Icon Color</span>
        <div className="command-icon-color-row">
          <input
            aria-label="Icon color"
            className="command-icon-color-swatch"
            disabled={isColorDisabled}
            onChange={(event) => {
              onIconColorChange(event.currentTarget.value);
              setColorText(event.currentTarget.value);
            }}
            type="color"
            value={iconColor}
          />
          <input
            className="group-title-input command-config-input command-icon-color-text"
            disabled={isColorDisabled}
            inputMode="text"
            onBlur={commitColorText}
            onChange={(event) => setColorText(event.currentTarget.value)}
            placeholder={DEFAULT_SIDEBAR_COMMAND_ICON_COLOR}
            spellCheck={false}
            value={colorText}
          />
        </div>
      </label>
    </div>
  );
}
