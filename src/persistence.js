const K_ACTIVE = "podves.activeProjectId";
const K_PROJECT_PREFIX = "podves.projects.";
const K_RECENT = "podves.recentProjects";
const SCHEMA = 1;

export function exportProjectJson(project) {
  return JSON.stringify({ schemaVersion: SCHEMA, project }, null, 2);
}

export function importProjectJson(json) {
  const data = JSON.parse(json);
  if (data.schemaVersion !== SCHEMA) {
    throw new Error(
      `Неподдерживаемая schemaVersion: ${data.schemaVersion}. Ожидалось: ${SCHEMA}.`
    );
  }
  if (!data.project) throw new Error("Отсутствует поле project в файле.");
  return data.project;
}

export function saveProjectToStorage(storage, project) {
  storage.setItem(K_PROJECT_PREFIX + project.id, JSON.stringify(project));
  _updateRecent(storage, project);
}

export function loadProjectFromStorage(storage, id) {
  const raw = storage.getItem(K_PROJECT_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

export function setActiveProjectId(storage, id) {
  storage.setItem(K_ACTIVE, id);
}

export function getActiveProjectId(storage) {
  return storage.getItem(K_ACTIVE);
}

export function listRecentProjects(storage) {
  const raw = storage.getItem(K_RECENT);
  return raw ? JSON.parse(raw) : [];
}

function _updateRecent(storage, project) {
  const list = listRecentProjects(storage).filter(e => e.id !== project.id);
  list.unshift({ id: project.id, name: project.name, updatedAt: project.updatedAt });
  while (list.length > 10) list.pop();
  storage.setItem(K_RECENT, JSON.stringify(list));
}
