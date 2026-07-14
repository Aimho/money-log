import { UNCATEGORIZED_GROUP_LABEL } from "@/lib/constants";

export function normalizeStoredGroupName(group: string) {
  return group.trim();
}

export function getGroupDisplayName(group: string) {
  const normalized = normalizeStoredGroupName(group);
  return normalized || UNCATEGORIZED_GROUP_LABEL;
}
