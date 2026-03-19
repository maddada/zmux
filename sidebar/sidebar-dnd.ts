type SessionDragData = {
  groupId: string;
  kind: "session";
  sessionId: string;
};

type GroupDropData = {
  groupId: string;
  kind: "group";
};

type CreateGroupDropData = {
  kind: "create-group";
};

export type SidebarDropData = SessionDragData | GroupDropData | CreateGroupDropData;

export function createSessionDragData(groupId: string, sessionId: string): SessionDragData {
  return {
    groupId,
    kind: "session",
    sessionId,
  };
}

export function createGroupDropData(groupId: string): GroupDropData {
  return {
    groupId,
    kind: "group",
  };
}

export function createCreateGroupDropData(): CreateGroupDropData {
  return {
    kind: "create-group",
  };
}

export function getSidebarDropData(candidate: { data?: unknown } | null | undefined) {
  const data = candidate?.data;
  if (!data || typeof data !== "object" || !("kind" in data)) {
    return undefined;
  }

  const parsedData = data as Partial<SidebarDropData>;
  switch (parsedData.kind) {
    case "session":
      return typeof parsedData.groupId === "string" && typeof parsedData.sessionId === "string"
        ? (parsedData as SessionDragData)
        : undefined;

    case "group":
      return typeof parsedData.groupId === "string" ? (parsedData as GroupDropData) : undefined;

    case "create-group":
      return parsedData as CreateGroupDropData;

    default:
      return undefined;
  }
}
