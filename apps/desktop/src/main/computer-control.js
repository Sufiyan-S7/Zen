const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

let approvedAppsPath = '';

const MAX_SEARCH_RESULTS = 100;
const MAX_SEARCH_QUERY_LENGTH = 200;

const TOOL_REGISTRY = Object.freeze({
  'open-website': Object.freeze({ id: 'open-website', label: 'Open a website', requiresConfirmation: true, enabled: true }),
  'open-approved-app': Object.freeze({ id: 'open-approved-app', label: 'Open an approved app', requiresConfirmation: true, enabled: true }),
  'search-folder': Object.freeze({ id: 'search-folder', label: 'Search a selected folder', requiresConfirmation: true, enabled: true })
});

function appEntry(executable) {
  const resolved = path.resolve(executable);
  if (path.extname(resolved).toLowerCase() !== '.exe') throw new Error('Choose a Windows application (.exe).');
  const details = fs.statSync(resolved);
  if (!details.isFile()) throw new Error('Choose an application file, not a folder.');
  const verified = fs.realpathSync(resolved);
  return {
    id: crypto.createHash('sha256').update(verified.toLowerCase()).digest('hex').slice(0, 24),
    label: path.basename(verified, '.exe'),
    executable: verified,
    approvedAt: new Date().toISOString()
  };
}

function configureApprovedApps(userDataPath) {
  approvedAppsPath = path.join(userDataPath, 'approved-apps.json');
  if (!fs.existsSync(approvedAppsPath) && fs.existsSync('C:\\Windows\\explorer.exe')) {
    writeApprovedApps([appEntry('C:\\Windows\\explorer.exe')]);
  }
}

function readApprovedApps() {
  if (!approvedAppsPath) throw new Error('Zen has not prepared local app approvals yet.');
  try {
    const stored = JSON.parse(fs.readFileSync(approvedAppsPath, 'utf8'));
    if (!Array.isArray(stored)) throw new Error('Invalid approval list.');
    return stored.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.label === 'string' && typeof entry.executable === 'string');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new Error('Zen could not read the local approved-app list.');
  }
}

function writeApprovedApps(entries) {
  const tempPath = `${approvedAppsPath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(entries, null, 2), 'utf8');
  fs.renameSync(tempPath, approvedAppsPath);
}

function previewApp(executable) {
  const entry = appEntry(executable);
  return { id: entry.id, label: entry.label, executable: entry.executable };
}

function listApprovedApps() {
  return readApprovedApps().map(({ id, label, executable, approvedAt }) => ({ id, label, executable, approvedAt }));
}

function approveApp(executable) {
  const entry = appEntry(executable);
  const apps = readApprovedApps();
  const existing = apps.find((app) => app.id === entry.id);
  if (existing) return existing;
  apps.push(entry);
  writeApprovedApps(apps);
  return entry;
}

function removeApprovedApp(appId) {
  if (typeof appId !== 'string' || !/^[a-f0-9]{24}$/.test(appId)) throw new Error('That app approval is invalid.');
  const apps = readApprovedApps();
  const entry = apps.find((app) => app.id === appId);
  if (!entry) throw new Error('That app is not approved in Zen.');
  writeApprovedApps(apps.filter((app) => app.id !== appId));
  return entry;
}

function approvedApp(appId) {
  if (typeof appId !== 'string' || !/^[a-f0-9]{24}$/.test(appId)) throw new Error('That app approval is invalid.');
  const entry = readApprovedApps().find((app) => app.id === appId);
  if (!entry) throw new Error('That app is not approved in Zen.');
  return appEntry(entry.executable);
}

function websitePreview(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error('Enter a website address up to 2,048 characters long.');
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new Error('That website address contains invalid characters.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a complete HTTPS website address, such as https://example.com.'); }
  if (url.protocol !== 'https:') throw new Error('Zen can open HTTPS websites only.');
  if (url.username || url.password) throw new Error('Website addresses with embedded sign-in details are not allowed.');
  if (url.hash) throw new Error('Remove the part after #, then try again.');
  return { url: url.toString(), hostname: url.hostname };
}

function validateSearchQuery(query) {
  if (typeof query !== 'string' || !query.trim() || query.length > MAX_SEARCH_QUERY_LENGTH) {
    throw new Error('Enter a search term up to 200 characters long.');
  }
  if (/[\u0000-\u001f\u007f]/.test(query)) throw new Error('That search term contains invalid characters.');
  return query.trim();
}

function validateFolderPath(folderPath) {
  if (typeof folderPath !== 'string' || !folderPath.trim()) throw new Error('Choose a folder before searching.');
  const resolved = path.resolve(folderPath.trim());
  const details = fs.statSync(resolved);
  if (!details.isDirectory()) throw new Error('Choose a folder, not a file.');
  return fs.realpathSync(resolved);
}

function isPathInsideRoot(candidatePath, rootFolder) {
  const relative = path.relative(rootFolder, path.resolve(candidatePath));
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function searchFolderNames(folderPath, query) {
  const rootFolder = validateFolderPath(folderPath);
  const term = validateSearchQuery(query).toLowerCase();
  const matches = [];
  let capped = false;

  function walk(currentDir) {
    if (matches.length >= MAX_SEARCH_RESULTS) {
      capped = true;
      return;
    }
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (matches.length >= MAX_SEARCH_RESULTS) {
        capped = true;
        return;
      }
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isSymbolicLink()) continue;
      let verifiedPath;
      try {
        verifiedPath = fs.realpathSync(entryPath);
      } catch {
        continue;
      }
      if (!isPathInsideRoot(verifiedPath, rootFolder) && verifiedPath !== rootFolder) continue;
      if (entry.name.toLowerCase().includes(term)) {
        let type = 'file';
        try {
          type = fs.statSync(verifiedPath).isDirectory() ? 'folder' : 'file';
        } catch {
          continue;
        }
        matches.push({ name: entry.name, path: verifiedPath, type });
      }
      if (entry.isDirectory()) walk(entryPath);
    }
  }

  walk(rootFolder);
  return { folderPath: rootFolder, query: term, matches, capped, count: matches.length };
}

function toolRegistryStatus() { return Object.values(TOOL_REGISTRY).map(({ id, label, requiresConfirmation, enabled }) => ({ id, label, requiresConfirmation, enabled })); }

module.exports = {
  configureApprovedApps,
  toolRegistryStatus,
  websitePreview,
  previewApp,
  listApprovedApps,
  approveApp,
  removeApprovedApp,
  approvedApp,
  validateSearchQuery,
  validateFolderPath,
  searchFolderNames
};
