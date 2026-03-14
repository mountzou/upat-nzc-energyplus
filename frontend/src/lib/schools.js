export function formatSchoolLabel(schoolId) {
  if (!schoolId) {
    return "";
  }

  const match = /^school_(.+)$/.exec(schoolId);
  if (!match) {
    return schoolId;
  }

  return `School ${match[1]}`;
}
