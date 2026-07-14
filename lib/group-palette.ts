import { GROUP_TONE_VARIABLES } from "@/lib/constants";

function hashGroupName(name: string) {
  return name.split("").reduce((hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0);
}

export function getGroupTone(groupName: string) {
  const index = Math.abs(hashGroupName(groupName)) % GROUP_TONE_VARIABLES.length;
  return GROUP_TONE_VARIABLES[index];
}
