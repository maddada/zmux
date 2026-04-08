import { describe, expect, test } from "vite-plus/test";
import { applyTextEditingKey, isTextEditingKey } from "./text-input-keyboard";

describe("isTextEditingKey", () => {
  test("should accept printable keys and basic deletion keys", () => {
    expect(
      isTextEditingKey({
        altKey: false,
        ctrlKey: false,
        isComposing: false,
        key: "a",
        metaKey: false,
      }),
    ).toBe(true);
    expect(
      isTextEditingKey({
        altKey: false,
        ctrlKey: false,
        isComposing: false,
        key: "Backspace",
        metaKey: false,
      }),
    ).toBe(true);
    expect(
      isTextEditingKey({
        altKey: false,
        ctrlKey: false,
        isComposing: false,
        key: "Delete",
        metaKey: false,
      }),
    ).toBe(true);
  });

  test("should ignore modified or non-printable keys", () => {
    expect(
      isTextEditingKey({
        altKey: false,
        ctrlKey: true,
        isComposing: false,
        key: "f",
        metaKey: false,
      }),
    ).toBe(false);
    expect(
      isTextEditingKey({
        altKey: false,
        ctrlKey: false,
        isComposing: false,
        key: "ArrowDown",
        metaKey: false,
      }),
    ).toBe(false);
    expect(
      isTextEditingKey({
        altKey: false,
        ctrlKey: false,
        isComposing: true,
        key: "a",
        metaKey: false,
      }),
    ).toBe(false);
  });
});

describe("applyTextEditingKey", () => {
  test("should append printable characters at the caret", () => {
    expect(
      applyTextEditingKey(
        {
          selectionEnd: 5,
          selectionStart: 5,
          value: "atlas",
        },
        "!",
      ),
    ).toEqual({
      selectionEnd: 6,
      selectionStart: 6,
      value: "atlas!",
    });
  });

  test("should replace the selected range when typing", () => {
    expect(
      applyTextEditingKey(
        {
          selectionEnd: 5,
          selectionStart: 0,
          value: "atlas",
        },
        "r",
      ),
    ).toEqual({
      selectionEnd: 1,
      selectionStart: 1,
      value: "r",
    });
  });

  test("should delete the previous character on backspace", () => {
    expect(
      applyTextEditingKey(
        {
          selectionEnd: 3,
          selectionStart: 3,
          value: "cod",
        },
        "Backspace",
      ),
    ).toEqual({
      selectionEnd: 2,
      selectionStart: 2,
      value: "co",
    });
  });

  test("should delete the next character on delete", () => {
    expect(
      applyTextEditingKey(
        {
          selectionEnd: 1,
          selectionStart: 1,
          value: "codex",
        },
        "Delete",
      ),
    ).toEqual({
      selectionEnd: 1,
      selectionStart: 1,
      value: "cdex",
    });
  });

  test("should no-op backspace at the start of the value", () => {
    expect(
      applyTextEditingKey(
        {
          selectionEnd: 0,
          selectionStart: 0,
          value: "codex",
        },
        "Backspace",
      ),
    ).toEqual({
      selectionEnd: 0,
      selectionStart: 0,
      value: "codex",
    });
  });
});
