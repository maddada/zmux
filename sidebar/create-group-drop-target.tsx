import { useDroppable } from "@dnd-kit/react";
import { createCreateGroupDropData } from "./sidebar-dnd";

export type CreateGroupDropTargetProps = {
  isVisible: boolean;
};

export function CreateGroupDropTarget({ isVisible }: CreateGroupDropTargetProps) {
  const droppable = useDroppable({
    accept: "session",
    data: createCreateGroupDropData(),
    id: "create-group",
  });

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="group-create-target"
      data-drop-target={String(droppable.isDropTarget)}
      ref={droppable.ref}
    >
      <div className="group-create-plus">+</div>
      <div className="group-create-copy">Drop here to create a new group</div>
    </div>
  );
}
