// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use git2::{Repository, Signature, PushOptions, RemoteCallbacks, Cred, FetchOptions};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::env;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
struct GitCommit {
    id: String,
    message: String,
    author: String,
    email: String,
    timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct GitStatus {
    modified: Vec<String>,
    added: Vec<String>,
    deleted: Vec<String>,
    untracked: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GitDiff {
    file_path: String,
    old_content: String,
    new_content: String,
    hunks: Vec<DiffHunk>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DiffHunk {
    old_start: u32,
    old_lines: u32,
    new_start: u32,
    new_lines: u32,
    lines: Vec<DiffLine>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DiffLine {
    origin: char,
    content: String,
    old_lineno: Option<u32>,
    new_lineno: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GitBranch {
    name: String,
    is_head: bool,
    is_remote: bool,
    target: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GitRemote {
    name: String,
    url: String,
    fetch_refspecs: Vec<String>,
    push_refspecs: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GitStash {
    index: usize,
    message: String,
    author: String,
    timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct MergeConflict {
    file_path: String,
    ancestor_content: String,
    our_content: String,
    their_content: String,
    resolution: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LogEntry {
    id: String,
    message: String,
    author: String,
    email: String,
    timestamp: i64,
    parents: Vec<String>,
    refs: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct RebaseCommit {
    id: String,
    message: String,
    author: String,
    email: String,
    timestamp: i64,
    action: RebaseAction,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
enum RebaseAction {
    Pick,
    Squash,
    Edit,
    Reword,
    Drop,
}

#[derive(Debug, Serialize, Deserialize)]
struct RebasePlan {
    commits: Vec<RebaseCommit>,
    onto_branch: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GitSubmodule {
    name: String,
    path: String,
    url: String,
    branch: Option<String>,
    head_id: String,
    workdir_id: Option<String>,
    status: SubmoduleStatus,
}

#[derive(Debug, Serialize, Deserialize)]
enum SubmoduleStatus {
    Uninitialized,
    Initialized,
    Modified,
    UpToDate,
}

#[derive(Debug, Serialize, Deserialize)]
struct RepositoryInfo {
    name: String,
    path: String,
    current_branch: String,
    last_commit: String,
    is_dirty: bool,
    last_accessed: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct FileContent {
    path: String,
    content: String,
    is_binary: bool,
    size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct BranchInfo {
    name: String,
    is_current: bool,
    is_remote: bool,
    commit_count: usize,
    last_commit_message: String,
    last_commit_date: i64,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to CodeGit!", name)
}

#[tauri::command]
fn discover_repositories() -> Result<Vec<RepositoryInfo>, String> {
    let home = env::var("HOME").unwrap_or_else(|_| "/".to_string());
    let mut repositories = Vec::new();
    
    // Buscar em diretórios comuns
    let search_paths = vec![
        PathBuf::from(&home),
        PathBuf::from(format!("{}/Documents", home)),
        PathBuf::from(format!("{}/Desktop", home)),
        PathBuf::from(format!("{}/Projects", home)),
        PathBuf::from(format!("{}/Developer", home)),
        PathBuf::from(format!("{}/Code", home)),
        PathBuf::from(format!("{}/Development", home)),
        PathBuf::from(format!("{}/workspace", home)),
        PathBuf::from(format!("{}/git", home)),
        // Adicionar o próprio diretório do CodeGit para teste
        PathBuf::from("/Users/diogo/Projetos/NovosProjetos/GitHub/codegit"),
    ];

    for search_path in search_paths {
        if search_path.exists() && search_path.is_dir() {
            // Busca recursiva limitada a 3 níveis
            search_repositories_recursive(&search_path, &mut repositories, 0, 3);
        }
    }
    
    // Remover duplicatas baseado no path
    repositories.sort_by(|a, b| a.path.cmp(&b.path));
    repositories.dedup_by(|a, b| a.path == b.path);
    
    // Ordenar por nome para melhor visualização
    repositories.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(repositories)
}

fn search_repositories_recursive(
    dir: &PathBuf, 
    repositories: &mut Vec<RepositoryInfo>, 
    current_depth: usize, 
    max_depth: usize
) {
    if current_depth > max_depth {
        return;
    }
    
    // Verificar se o diretório atual é um repositório Git
    if let Some(repo_info) = check_git_repository(dir) {
        println!("    🎯 Found Git repo: {}", repo_info.name);
        repositories.push(repo_info);
        return; // Não continuar buscando dentro de um repo Git
    }
    
    // Buscar em subdiretórios
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_dir() {
                    let path = entry.path();
                    // Pular diretórios ocultos e node_modules
                    if let Some(name) = path.file_name() {
                        let name_str = name.to_string_lossy();
                        if !name_str.starts_with('.') && name_str != "node_modules" {
                            search_repositories_recursive(&path, repositories, current_depth + 1, max_depth);
                        }
                    }
                }
            }
        }
    }
}

fn check_git_repository(path: &PathBuf) -> Option<RepositoryInfo> {
    // Verificar se existe pasta .git
    let git_dir = path.join(".git");
    if !git_dir.exists() {
        return None;
    }
    
    if let Ok(repo) = Repository::open(path) {
        let name = path.file_name()?.to_string_lossy().to_string();
        let path_str = path.to_string_lossy().to_string();
        
        let current_branch = repo.head()
            .ok()
            .and_then(|head| head.shorthand().map(|s| s.to_string()))
            .unwrap_or_else(|| "main".to_string());
            
        let last_commit = repo.head()
            .ok()
            .and_then(|head| head.peel_to_commit().ok())
            .map(|commit| commit.id().to_string()[..8].to_string())
            .unwrap_or_else(|| "no-commits".to_string());
        
        let is_dirty = repo.statuses(None)
            .map(|statuses| !statuses.is_empty())
            .unwrap_or(false);
        
        // Usar tempo de modificação do diretório .git como aproximação do último acesso
        let last_accessed = git_dir
            .metadata()
            .and_then(|meta| meta.modified())
            .map(|time| time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default())
            .map(|duration| duration.as_secs() as i64)
            .unwrap_or_else(|_| {
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64
            });
            
        Some(RepositoryInfo {
            name,
            path: path_str,
            current_branch,
            last_commit,
            is_dirty,
            last_accessed,
        })
    } else {
        None
    }
}

#[tauri::command]
fn get_file_content(repo_path: String, file_path: String) -> Result<FileContent, String> {
    let full_path = format!("{}/{}", repo_path, file_path);
    
    match fs::read(&full_path) {
        Ok(content_bytes) => {
            let is_binary = content_bytes.iter().any(|&b| b == 0);
            let content = if is_binary {
                format!("Binary file ({} bytes)", content_bytes.len())
            } else {
                String::from_utf8_lossy(&content_bytes).to_string()
            };
            
            Ok(FileContent {
                path: file_path,
                content,
                is_binary,
                size: content_bytes.len() as u64,
            })
        }
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
fn get_detailed_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut branches = Vec::new();
    let current_branch = repo.head()
        .ok()
        .and_then(|head| head.shorthand().map(|s| s.to_string()));
    
    // Branches locais
    if let Ok(local_branches) = repo.branches(Some(git2::BranchType::Local)) {
        for branch_result in local_branches {
            if let Ok((branch, _)) = branch_result {
                if let Some(name) = branch.name().unwrap_or(None) {
                    let is_current = current_branch.as_ref() == Some(&name.to_string());
                    
                    let (last_commit_message, last_commit_date, commit_count) = 
                        get_branch_info(&repo, name);
                    
                    branches.push(BranchInfo {
                        name: name.to_string(),
                        is_current,
                        is_remote: false,
                        commit_count,
                        last_commit_message,
                        last_commit_date,
                    });
                }
            }
        }
    }
    
    // Branches remotos
    if let Ok(remote_branches) = repo.branches(Some(git2::BranchType::Remote)) {
        for branch_result in remote_branches {
            if let Ok((branch, _)) = branch_result {
                if let Some(name) = branch.name().unwrap_or(None) {
                    let (last_commit_message, last_commit_date, commit_count) = 
                        get_branch_info(&repo, name);
                    
                    branches.push(BranchInfo {
                        name: name.to_string(),
                        is_current: false,
                        is_remote: true,
                        commit_count,
                        last_commit_message,
                        last_commit_date,
                    });
                }
            }
        }
    }
    
    Ok(branches)
}

fn get_branch_info(repo: &Repository, branch_name: &str) -> (String, i64, usize) {
    if let Ok(branch_ref) = repo.find_reference(&format!("refs/heads/{}", branch_name))
        .or_else(|_| repo.find_reference(&format!("refs/remotes/{}", branch_name))) {
        
        if let Ok(commit) = branch_ref.peel_to_commit() {
            let message = commit.message().unwrap_or("No message").to_string();
            let timestamp = commit.time().seconds();
            
            // Contar commits na branch
            let mut revwalk = repo.revwalk().unwrap_or_else(|_| repo.revwalk().unwrap());
            revwalk.push(commit.id()).unwrap_or_default();
            let commit_count = revwalk.count();
            
            return (message, timestamp, commit_count);
        }
    }
    
    ("Unknown".to_string(), 0, 0)
}

#[tauri::command]
fn open_repository(path: String) -> Result<String, String> {
    match Repository::open(&path) {
        Ok(_) => Ok(format!("Successfully opened repository at: {}", path)),
        Err(e) => Err(format!("Failed to open repository: {}", e)),
    }
}

#[tauri::command]
fn get_commits(repo_path: String, limit: Option<usize>) -> Result<Vec<GitCommit>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut revwalk = repo.revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;
    
    revwalk.push_head()
        .map_err(|e| format!("Failed to push HEAD: {}", e))?;
    
    let mut commits = Vec::new();
    let max_commits = limit.unwrap_or(50);
    
    for (i, oid_result) in revwalk.enumerate() {
        if i >= max_commits {
            break;
        }
        
        let oid = oid_result.map_err(|e| format!("Failed to get OID: {}", e))?;
        let commit = repo.find_commit(oid)
            .map_err(|e| format!("Failed to find commit: {}", e))?;
        
        let author = commit.author();
        
        commits.push(GitCommit {
            id: oid.to_string(),
            message: commit.message().unwrap_or("No message").to_string(),
            author: author.name().unwrap_or("Unknown").to_string(),
            email: author.email().unwrap_or("unknown@email.com").to_string(),
            timestamp: commit.time().seconds(),
        });
    }
    
    Ok(commits)
}

#[tauri::command]
fn get_repository_status(repo_path: String) -> Result<GitStatus, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let statuses = repo.statuses(None)
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    let mut status = GitStatus {
        modified: Vec::new(),
        added: Vec::new(),
        deleted: Vec::new(),
        untracked: Vec::new(),
    };
    
    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let flags = entry.status();
        
        if flags.contains(git2::Status::WT_MODIFIED) {
            status.modified.push(path.clone());
        }
        if flags.contains(git2::Status::INDEX_NEW) {
            status.added.push(path.clone());
        }
        if flags.contains(git2::Status::WT_DELETED) {
            status.deleted.push(path.clone());
        }
        if flags.contains(git2::Status::WT_NEW) {
            status.untracked.push(path.clone());
        }
    }
    
    Ok(status)
}

#[tauri::command]
fn stage_file(repo_path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut index = repo.index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    index.add_path(Path::new(&file_path))
        .map_err(|e| format!("Failed to stage file: {}", e))?;
    
    index.write()
        .map_err(|e| format!("Failed to write index: {}", e))?;
    
    Ok(format!("Staged file: {}", file_path))
}

#[tauri::command]
fn unstage_file(repo_path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    
    let _head_tree = head.peel_to_tree()
        .map_err(|e| format!("Failed to get HEAD tree: {}", e))?;
    
    let target_obj = head.peel(git2::ObjectType::Commit)
        .map_err(|e| format!("Failed to peel to commit: {}", e))?;
    repo.reset_default(Some(&target_obj), &[Path::new(&file_path)])
        .map_err(|e| format!("Failed to unstage file: {}", e))?;
    
    Ok(format!("Unstaged file: {}", file_path))
}

#[tauri::command]
fn commit_changes(repo_path: String, message: String, author_name: String, author_email: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let signature = Signature::now(&author_name, &author_email)
        .map_err(|e| format!("Failed to create signature: {}", e))?;
    
    let mut index = repo.index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    let tree_id = index.write_tree()
        .map_err(|e| format!("Failed to write tree: {}", e))?;
    
    let tree = repo.find_tree(tree_id)
        .map_err(|e| format!("Failed to find tree: {}", e))?;
    
    let parent_commit = match repo.head() {
        Ok(head) => Some(head.peel_to_commit().map_err(|e| format!("Failed to get parent commit: {}", e))?),
        Err(_) => None, // First commit
    };
    
    let parents = match &parent_commit {
        Some(commit) => vec![commit],
        None => vec![],
    };
    
    let commit_id = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        &message,
        &tree,
        &parents,
    ).map_err(|e| format!("Failed to create commit: {}", e))?;
    
    Ok(format!("Created commit: {}", commit_id))
}

#[tauri::command]
fn get_file_diff(repo_path: String, file_path: String) -> Result<GitDiff, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let head_tree = match repo.head() {
        Ok(head) => Some(head.peel_to_tree().map_err(|e| format!("Failed to get HEAD tree: {}", e))?),
        Err(_) => None,
    };
    
    let mut diff_opts = git2::DiffOptions::new();
    diff_opts.pathspec(&file_path);
    
    let _diff = repo.diff_tree_to_workdir(head_tree.as_ref(), Some(&mut diff_opts))
        .map_err(|e| format!("Failed to get diff: {}", e))?;
    
    // For now, return a basic diff structure  
    let git_diff = GitDiff {
        file_path: file_path.clone(),
        old_content: String::new(),
        new_content: String::new(),
        hunks: Vec::new(),
    };
    
    Ok(git_diff)
}

#[tauri::command]
fn get_branches(repo_path: String) -> Result<Vec<GitBranch>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let branches = repo.branches(None)
        .map_err(|e| format!("Failed to get branches: {}", e))?;
    
    let mut git_branches = Vec::new();
    
    for branch_result in branches {
        let (branch, branch_type) = branch_result.map_err(|e| format!("Failed to get branch: {}", e))?;
        
        let name = branch.name().map_err(|e| format!("Failed to get branch name: {}", e))?
            .unwrap_or("Unknown").to_string();
        
        let is_head = branch.is_head();
        let is_remote = branch_type == git2::BranchType::Remote;
        let target = branch.get().target().map(|oid| oid.to_string());
        
        git_branches.push(GitBranch {
            name,
            is_head,
            is_remote,
            target,
        });
    }
    
    Ok(git_branches)
}

#[tauri::command] 
fn create_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let head_commit = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?
        .peel_to_commit()
        .map_err(|e| format!("Failed to get HEAD commit: {}", e))?;
    
    repo.branch(&branch_name, &head_commit, false)
        .map_err(|e| format!("Failed to create branch: {}", e))?;
    
    Ok(format!("Created branch: {}", branch_name))
}

#[tauri::command]
fn switch_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let branch = repo.find_branch(&branch_name, git2::BranchType::Local)
        .map_err(|e| format!("Failed to find branch: {}", e))?;
    
    let branch_ref = branch.get();
    let target_commit = branch_ref.peel_to_commit()
        .map_err(|e| format!("Failed to get commit: {}", e))?;
    
    repo.checkout_tree(target_commit.as_object(), None)
        .map_err(|e| format!("Failed to checkout tree: {}", e))?;
    
    repo.set_head(&format!("refs/heads/{}", branch_name))
        .map_err(|e| format!("Failed to set HEAD: {}", e))?;
    
    Ok(format!("Switched to branch: {}", branch_name))
}

#[tauri::command]
fn get_remotes(repo_path: String) -> Result<Vec<GitRemote>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let remote_names = repo.remotes()
        .map_err(|e| format!("Failed to get remotes: {}", e))?;
    
    let mut remotes = Vec::new();
    
    for remote_name in remote_names.iter() {
        if let Some(name) = remote_name {
            let remote = repo.find_remote(name)
                .map_err(|e| format!("Failed to find remote {}: {}", name, e))?;
            
            let url = remote.url().unwrap_or("").to_string();
            let fetch_refspecs = remote.fetch_refspecs()
                .map_err(|e| format!("Failed to get fetch refspecs: {}", e))?
                .iter()
                .filter_map(|s| s.map(|s| s.to_string()))
                .collect();
            let push_refspecs = remote.push_refspecs()
                .map_err(|e| format!("Failed to get push refspecs: {}", e))?
                .iter()
                .filter_map(|s| s.map(|s| s.to_string()))
                .collect();
            
            remotes.push(GitRemote {
                name: name.to_string(),
                url,
                fetch_refspecs,
                push_refspecs,
            });
        }
    }
    
    Ok(remotes)
}

#[tauri::command]
fn add_remote(repo_path: String, name: String, url: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    repo.remote(&name, &url)
        .map_err(|e| format!("Failed to add remote: {}", e))?;
    
    Ok(format!("Added remote '{}' with URL: {}", name, url))
}

#[tauri::command]
fn remove_remote(repo_path: String, name: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    repo.remote_delete(&name)
        .map_err(|e| format!("Failed to remove remote: {}", e))?;
    
    Ok(format!("Removed remote: {}", name))
}

fn get_credentials_callback() -> RemoteCallbacks<'static> {
    let mut callbacks = RemoteCallbacks::new();
    
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        // Try SSH key authentication first
        if let Ok(home) = env::var("HOME") {
            let ssh_key_path = format!("{}/.ssh/id_rsa", home);
            let ssh_pub_key_path = format!("{}/.ssh/id_rsa.pub", home);
            
            if Path::new(&ssh_key_path).exists() {
                return Cred::ssh_key(
                    username_from_url.unwrap_or("git"),
                    Some(Path::new(&ssh_pub_key_path)),
                    Path::new(&ssh_key_path),
                    None
                );
            }
        }
        
        // Fallback to username/password from environment or prompt
        if let (Ok(username), Ok(password)) = (env::var("GIT_USERNAME"), env::var("GIT_PASSWORD")) {
            return Cred::userpass_plaintext(&username, &password);
        }
        
        // Try default username if provided
        if let Some(username) = username_from_url {
            if let Ok(password) = env::var("GIT_PASSWORD") {
                return Cred::userpass_plaintext(username, &password);
            }
        }
        
        Cred::default()
    });
    
    callbacks
}

#[tauri::command]
fn fetch_from_remote(repo_path: String, remote_name: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut remote = repo.find_remote(&remote_name)
        .map_err(|e| format!("Failed to find remote '{}': {}", remote_name, e))?;
    
    let callbacks = get_credentials_callback();
    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);
    
    remote.fetch(&[] as &[&str], Some(&mut fetch_options), None)
        .map_err(|e| format!("Failed to fetch from remote '{}': {}", remote_name, e))?;
    
    Ok(format!("Successfully fetched from remote: {}", remote_name))
}

#[tauri::command]
fn pull_from_remote(repo_path: String, remote_name: String, branch_name: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    // First fetch
    let mut remote = repo.find_remote(&remote_name)
        .map_err(|e| format!("Failed to find remote '{}': {}", remote_name, e))?;
    
    let callbacks = get_credentials_callback();
    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);
    
    remote.fetch(&[] as &[&str], Some(&mut fetch_options), None)
        .map_err(|e| format!("Failed to fetch from remote '{}': {}", remote_name, e))?;
    
    // Get the remote branch reference
    let remote_branch_name = format!("refs/remotes/{}/{}", remote_name, branch_name);
    let remote_branch_ref = repo.find_reference(&remote_branch_name)
        .map_err(|e| format!("Failed to find remote branch '{}': {}", remote_branch_name, e))?;
    
    let remote_commit = remote_branch_ref.peel_to_commit()
        .map_err(|e| format!("Failed to get remote commit: {}", e))?;
    
    // Get current head
    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let current_commit = head.peel_to_commit()
        .map_err(|e| format!("Failed to get current commit: {}", e))?;
    
    // Check if fast-forward is possible
    let merge_base = repo.merge_base(current_commit.id(), remote_commit.id())
        .map_err(|e| format!("Failed to find merge base: {}", e))?;
    
    if merge_base == current_commit.id() {
        // Fast-forward merge
        let mut reference = repo.find_reference(&format!("refs/heads/{}", branch_name))
            .map_err(|e| format!("Failed to find local branch: {}", e))?;
        
        reference.set_target(remote_commit.id(), "Fast-forward merge")
            .map_err(|e| format!("Failed to update branch reference: {}", e))?;
        
        repo.checkout_tree(remote_commit.as_object(), None)
            .map_err(|e| format!("Failed to checkout: {}", e))?;
        
        Ok(format!("Successfully pulled and fast-forwarded branch '{}' from '{}'", branch_name, remote_name))
    } else {
        Ok(format!("Pull completed with fetch. Manual merge may be required."))
    }
}

#[tauri::command]
fn push_to_remote(repo_path: String, remote_name: String, branch_name: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut remote = repo.find_remote(&remote_name)
        .map_err(|e| format!("Failed to find remote '{}': {}", remote_name, e))?;
    
    let callbacks = get_credentials_callback();
    let mut push_options = PushOptions::new();
    push_options.remote_callbacks(callbacks);
    
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);
    
    remote.push(&[&refspec], Some(&mut push_options))
        .map_err(|e| format!("Failed to push to remote '{}': {}", remote_name, e))?;
    
    Ok(format!("Successfully pushed branch '{}' to remote '{}'", branch_name, remote_name))
}

#[tauri::command]
fn clone_repository(url: String, path: String) -> Result<String, String> {
    let callbacks = get_credentials_callback();
    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);
    
    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fetch_options);
    
    builder.clone(&url, Path::new(&path))
        .map_err(|e| format!("Failed to clone repository: {}", e))?;
    
    Ok(format!("Successfully cloned repository to: {}", path))
}

#[tauri::command]
fn create_stash(repo_path: String, message: String, author_name: String, author_email: String) -> Result<String, String> {
    let mut repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let signature = Signature::now(&author_name, &author_email)
        .map_err(|e| format!("Failed to create signature: {}", e))?;
    
    let stash_id = repo.stash_save(&signature, &message, Some(git2::StashFlags::DEFAULT))
        .map_err(|e| format!("Failed to create stash: {}", e))?;
    
    Ok(format!("Created stash: {}", stash_id))
}

#[tauri::command]
fn get_stashes(repo_path: String) -> Result<Vec<GitStash>, String> {
    let mut repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut stashes = Vec::new();
    let mut temp_stashes = Vec::new();
    
    // First, collect the stash info without holding the repo reference
    repo.stash_foreach(|index, message, oid| {
        temp_stashes.push((index, message.to_string(), *oid));
        true
    }).map_err(|e| format!("Failed to iterate stashes: {}", e))?;
    
    // Then, process each stash to get commit details
    for (index, message, oid) in temp_stashes {
        if let Ok(commit) = repo.find_commit(oid) {
            let author = commit.author();
            stashes.push(GitStash {
                index,
                message,
                author: author.name().unwrap_or("Unknown").to_string(),
                timestamp: commit.time().seconds(),
            });
        }
    }
    
    Ok(stashes)
}

#[tauri::command]
fn apply_stash(repo_path: String, index: usize) -> Result<String, String> {
    let mut repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    repo.stash_apply(index, None)
        .map_err(|e| format!("Failed to apply stash: {}", e))?;
    
    Ok(format!("Applied stash at index: {}", index))
}

#[tauri::command]
fn drop_stash(repo_path: String, index: usize) -> Result<String, String> {
    let mut repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    repo.stash_drop(index)
        .map_err(|e| format!("Failed to drop stash: {}", e))?;
    
    Ok(format!("Dropped stash at index: {}", index))
}

#[tauri::command]
fn merge_branch(repo_path: String, branch_name: String, author_name: String, author_email: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let target_branch = repo.find_branch(&branch_name, git2::BranchType::Local)
        .map_err(|e| format!("Failed to find branch '{}': {}", branch_name, e))?;
    
    let target_commit = target_branch.get().peel_to_commit()
        .map_err(|e| format!("Failed to get target commit: {}", e))?;
    
    let head_commit = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?
        .peel_to_commit()
        .map_err(|e| format!("Failed to get HEAD commit: {}", e))?;
    
    // Check if fast-forward is possible
    let merge_base = repo.merge_base(head_commit.id(), target_commit.id())
        .map_err(|e| format!("Failed to find merge base: {}", e))?;
    
    if merge_base == head_commit.id() {
        // Fast-forward merge
        let head_ref = repo.head()
            .map_err(|e| format!("Failed to get HEAD reference: {}", e))?;
        
        repo.reference(
            head_ref.name().unwrap(),
            target_commit.id(),
            true,
            &format!("Fast-forward merge of {}", branch_name)
        ).map_err(|e| format!("Failed to update HEAD: {}", e))?;
        
        repo.checkout_tree(target_commit.as_object(), None)
            .map_err(|e| format!("Failed to checkout: {}", e))?;
        
        Ok(format!("Fast-forward merged branch '{}'", branch_name))
    } else {
        // Three-way merge
        let signature = Signature::now(&author_name, &author_email)
            .map_err(|e| format!("Failed to create signature: {}", e))?;
        
        let merge_commit = repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            &format!("Merge branch '{}'", branch_name),
            &target_commit.tree().map_err(|e| format!("Failed to get target tree: {}", e))?,
            &[&head_commit, &target_commit]
        ).map_err(|e| format!("Failed to create merge commit: {}", e))?;
        
        Ok(format!("Merged branch '{}' with commit {}", branch_name, merge_commit))
    }
}

#[tauri::command]
fn get_merge_conflicts(repo_path: String) -> Result<Vec<MergeConflict>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let index = repo.index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    let mut conflicts = Vec::new();
    
    if index.has_conflicts() {
        let conflict_iter = index.conflicts()
            .map_err(|e| format!("Failed to get conflicts: {}", e))?;
        
        for conflict in conflict_iter {
            let conflict = conflict.map_err(|e| format!("Failed to get conflict entry: {}", e))?;
            
            if let (Some(ancestor), Some(our), Some(their)) = (&conflict.ancestor, &conflict.our, &conflict.their) {
                let file_path = String::from_utf8_lossy(&our.path).to_string();
                
                let ancestor_blob = repo.find_blob(ancestor.id)
                    .map_err(|e| format!("Failed to find ancestor blob: {}", e))?;
                let our_blob = repo.find_blob(our.id)
                    .map_err(|e| format!("Failed to find our blob: {}", e))?;
                let their_blob = repo.find_blob(their.id)
                    .map_err(|e| format!("Failed to find their blob: {}", e))?;
                
                conflicts.push(MergeConflict {
                    file_path,
                    ancestor_content: String::from_utf8_lossy(ancestor_blob.content()).to_string(),
                    our_content: String::from_utf8_lossy(our_blob.content()).to_string(),
                    their_content: String::from_utf8_lossy(their_blob.content()).to_string(),
                    resolution: None,
                });
            }
        }
    }
    
    Ok(conflicts)
}

#[tauri::command]
fn resolve_conflict(repo_path: String, file_path: String, resolution: String) -> Result<String, String> {
    use std::fs;
    
    let full_path = format!("{}/{}", repo_path, file_path);
    
    fs::write(&full_path, resolution)
        .map_err(|e| format!("Failed to write resolution: {}", e))?;
    
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut index = repo.index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    index.add_path(Path::new(&file_path))
        .map_err(|e| format!("Failed to add resolved file: {}", e))?;
    
    index.write()
        .map_err(|e| format!("Failed to write index: {}", e))?;
    
    Ok(format!("Resolved conflict in file: {}", file_path))
}

#[tauri::command]
fn cherry_pick_commit(repo_path: String, commit_id: String, author_name: String, author_email: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let commit_oid = git2::Oid::from_str(&commit_id)
        .map_err(|e| format!("Invalid commit ID: {}", e))?;
    
    let commit = repo.find_commit(commit_oid)
        .map_err(|e| format!("Failed to find commit: {}", e))?;
    
    let head_commit = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?
        .peel_to_commit()
        .map_err(|e| format!("Failed to get HEAD commit: {}", e))?;
    
    let signature = Signature::now(&author_name, &author_email)
        .map_err(|e| format!("Failed to create signature: {}", e))?;
    
    // Create cherry-pick commit
    let cherry_pick_commit = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        &format!("Cherry-pick: {}", commit.message().unwrap_or("")),
        &commit.tree().map_err(|e| format!("Failed to get commit tree: {}", e))?,
        &[&head_commit]
    ).map_err(|e| format!("Failed to create cherry-pick commit: {}", e))?;
    
    Ok(format!("Cherry-picked commit {} as {}", commit_id, cherry_pick_commit))
}

#[tauri::command]
fn rebase_interactive(repo_path: String, onto_branch: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let onto_branch_ref = repo.find_branch(&onto_branch, git2::BranchType::Local)
        .map_err(|e| format!("Failed to find branch '{}': {}", onto_branch, e))?;
    
    let onto_commit = onto_branch_ref.get().peel_to_commit()
        .map_err(|e| format!("Failed to get onto commit: {}", e))?;
    
    let head_commit = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?
        .peel_to_commit()
        .map_err(|e| format!("Failed to get HEAD commit: {}", e))?;
    
    // Find merge base
    let merge_base_oid = repo.merge_base(head_commit.id(), onto_commit.id())
        .map_err(|e| format!("Failed to find merge base: {}", e))?;
    
    if merge_base_oid == head_commit.id() {
        return Ok("Already up to date".to_string());
    }
    
    // For now, we'll do a simple rebase (move HEAD to onto_commit)
    // In a full implementation, you'd replay commits one by one
    let head_ref = repo.head()
        .map_err(|e| format!("Failed to get HEAD reference: {}", e))?;
    
    repo.reference(
        head_ref.name().unwrap(),
        onto_commit.id(),
        true,
        &format!("Rebase onto {}", onto_branch)
    ).map_err(|e| format!("Failed to update HEAD: {}", e))?;
    
    repo.checkout_tree(onto_commit.as_object(), None)
        .map_err(|e| format!("Failed to checkout: {}", e))?;
    
    Ok(format!("Rebased onto branch '{}'", onto_branch))
}

#[tauri::command]
fn get_log_graph(repo_path: String, limit: Option<usize>) -> Result<Vec<LogEntry>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let mut revwalk = repo.revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;
    
    revwalk.push_head()
        .map_err(|e| format!("Failed to push HEAD: {}", e))?;
    
    let mut entries = Vec::new();
    let max_entries = limit.unwrap_or(100);
    
    for (i, oid_result) in revwalk.enumerate() {
        if i >= max_entries {
            break;
        }
        
        let oid = oid_result.map_err(|e| format!("Failed to get OID: {}", e))?;
        let commit = repo.find_commit(oid)
            .map_err(|e| format!("Failed to find commit: {}", e))?;
        
        let author = commit.author();
        let parents: Vec<String> = commit.parents().map(|p| p.id().to_string()).collect();
        
        // Get references pointing to this commit
        let mut refs = Vec::new();
        let ref_iter = repo.references()
            .map_err(|e| format!("Failed to get references: {}", e))?;
        
        for reference in ref_iter {
            if let Ok(reference) = reference {
                if let Some(target_oid) = reference.target() {
                    if target_oid == oid {
                        if let Some(name) = reference.shorthand() {
                            refs.push(name.to_string());
                        }
                    }
                }
            }
        }
        
        entries.push(LogEntry {
            id: oid.to_string(),
            message: commit.message().unwrap_or("No message").to_string(),
            author: author.name().unwrap_or("Unknown").to_string(),
            email: author.email().unwrap_or("unknown@email.com").to_string(),
            timestamp: commit.time().seconds(),
            parents,
            refs,
        });
    }
    
    Ok(entries)
}

#[tauri::command]
fn reset_to_commit(repo_path: String, commit_id: String, reset_type: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;
    
    let commit_oid = git2::Oid::from_str(&commit_id)
        .map_err(|e| format!("Invalid commit ID: {}", e))?;
    
    let commit = repo.find_commit(commit_oid)
        .map_err(|e| format!("Failed to find commit: {}", e))?;
    
    let reset_type = match reset_type.as_str() {
        "soft" => git2::ResetType::Soft,
        "mixed" => git2::ResetType::Mixed,
        "hard" => git2::ResetType::Hard,
        _ => return Err("Invalid reset type. Use 'soft', 'mixed', or 'hard'".to_string()),
    };
    
    repo.reset(commit.as_object(), reset_type, None)
        .map_err(|e| format!("Failed to reset: {}", e))?;
    
    Ok(format!("Reset to commit {} ({:?})", commit_id, reset_type))
}

#[tauri::command]
fn prepare_interactive_rebase(repo_path: String, onto_branch: String, from_commit: String) -> Result<RebasePlan, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut revwalk = repo.revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;
    
    revwalk.push_head()
        .map_err(|e| format!("Failed to push HEAD: {}", e))?;
    
    let from_oid = git2::Oid::from_str(&from_commit)
        .map_err(|e| format!("Invalid commit ID: {}", e))?;
    
    revwalk.hide(from_oid)
        .map_err(|e| format!("Failed to hide commit: {}", e))?;

    let mut commits = Vec::new();
    
    for oid in revwalk {
        let oid = oid.map_err(|e| format!("Failed to get commit ID: {}", e))?;
        let commit = repo.find_commit(oid)
            .map_err(|e| format!("Failed to find commit: {}", e))?;
        
        let author = commit.author();
        commits.push(RebaseCommit {
            id: oid.to_string(),
            message: commit.message().unwrap_or("<no message>").to_string(),
            author: author.name().unwrap_or("Unknown").to_string(),
            email: author.email().unwrap_or("unknown@email.com").to_string(),
            timestamp: commit.time().seconds(),
            action: RebaseAction::Pick,
        });
    }

    commits.reverse();

    Ok(RebasePlan {
        commits,
        onto_branch,
    })
}

#[tauri::command]
fn execute_interactive_rebase(
    repo_path: String, 
    rebase_plan: RebasePlan,
    author_name: String,
    author_email: String
) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let signature = Signature::now(&author_name, &author_email)
        .map_err(|e| format!("Failed to create signature: {}", e))?;

    let onto_commit = repo.revparse_single(&rebase_plan.onto_branch)
        .map_err(|e| format!("Failed to find target: {}", e))?
        .peel_to_commit()
        .map_err(|e| format!("Failed to get commit: {}", e))?;

    let mut new_commits = Vec::new();
    let mut current_commit = onto_commit;

    for rebase_commit in &rebase_plan.commits {
        match rebase_commit.action {
            RebaseAction::Pick => {
                let commit = repo.find_commit(git2::Oid::from_str(&rebase_commit.id)
                    .map_err(|e| format!("Invalid commit ID: {}", e))?)
                    .map_err(|e| format!("Failed to find commit: {}", e))?;
                
                let tree = commit.tree().map_err(|e| format!("Failed to get tree: {}", e))?;
                let new_commit = repo.commit(
                    None,
                    &signature,
                    &signature,
                    &commit.message().unwrap_or("<no message>"),
                    &tree,
                    &[&current_commit],
                ).map_err(|e| format!("Failed to create commit: {}", e))?;

                current_commit = repo.find_commit(new_commit)
                    .map_err(|e| format!("Failed to find new commit: {}", e))?;
                new_commits.push(new_commit);
            },
            RebaseAction::Reword => {
                let commit = repo.find_commit(git2::Oid::from_str(&rebase_commit.id)
                    .map_err(|e| format!("Invalid commit ID: {}", e))?)
                    .map_err(|e| format!("Failed to find commit: {}", e))?;

                let tree = commit.tree().map_err(|e| format!("Failed to get tree: {}", e))?;
                let new_commit = repo.commit(
                    None,
                    &signature,
                    &signature,
                    &rebase_commit.message,
                    &tree,
                    &[&current_commit],
                ).map_err(|e| format!("Failed to create reworded commit: {}", e))?;

                current_commit = repo.find_commit(new_commit)
                    .map_err(|e| format!("Failed to find new commit: {}", e))?;
                new_commits.push(new_commit);
            },
            RebaseAction::Drop => {
                continue;
            },
            _ => {
                let commit = repo.find_commit(git2::Oid::from_str(&rebase_commit.id)
                    .map_err(|e| format!("Invalid commit ID: {}", e))?)
                    .map_err(|e| format!("Failed to find commit: {}", e))?;
                
                let tree = commit.tree().map_err(|e| format!("Failed to get tree: {}", e))?;
                let new_commit = repo.commit(
                    None,
                    &signature,
                    &signature,
                    &commit.message().unwrap_or("<no message>"),
                    &tree,
                    &[&current_commit],
                ).map_err(|e| format!("Failed to create commit: {}", e))?;

                current_commit = repo.find_commit(new_commit)
                    .map_err(|e| format!("Failed to find new commit: {}", e))?;
                new_commits.push(new_commit);
            }
        }
    }

    if let Some(last_commit_id) = new_commits.last() {
        let mut head = repo.head()
            .map_err(|e| format!("Failed to get HEAD: {}", e))?;
        
        head.set_target(*last_commit_id, "Interactive rebase completed")
            .map_err(|e| format!("Failed to update HEAD: {}", e))?;
    }

    Ok(format!("Interactive rebase completed successfully. {} commits processed.", new_commits.len()))
}

#[tauri::command]
fn get_submodules(_repo_path: String) -> Result<Vec<GitSubmodule>, String> {
    // Submodule support requires advanced libgit2 API usage
    // For now, return empty list
    Ok(Vec::new())
}

#[tauri::command]
fn add_submodule(_repo_path: String, _url: String, _path: String, _branch: Option<String>) -> Result<String, String> {
    Err("Submodule operations not yet implemented".to_string())
}

#[tauri::command]
fn update_submodule(_repo_path: String, _submodule_name: String, _recursive: bool) -> Result<String, String> {
    Err("Submodule operations not yet implemented".to_string())
}

#[tauri::command]
fn remove_submodule(_repo_path: String, _submodule_name: String) -> Result<String, String> {
    Err("Submodule operations not yet implemented".to_string())
}

#[tauri::command]
fn init_submodule(_repo_path: String, _submodule_name: String) -> Result<String, String> {
    Err("Submodule operations not yet implemented".to_string())
}

#[tauri::command]
fn sync_submodule(_repo_path: String, _submodule_name: String) -> Result<String, String> {
    Err("Submodule operations not yet implemented".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            open_repository,
            get_commits,
            get_repository_status,
            stage_file,
            unstage_file,
            commit_changes,
            get_file_diff,
            get_branches,
            create_branch,
            switch_branch,
            get_remotes,
            add_remote,
            remove_remote,
            fetch_from_remote,
            pull_from_remote,
            push_to_remote,
            clone_repository,
            create_stash,
            get_stashes,
            apply_stash,
            drop_stash,
            merge_branch,
            get_merge_conflicts,
            resolve_conflict,
            cherry_pick_commit,
            rebase_interactive,
            get_log_graph,
            reset_to_commit,
            prepare_interactive_rebase,
            execute_interactive_rebase,
            get_submodules,
            add_submodule,
            update_submodule,
            remove_submodule,
            init_submodule,
            sync_submodule,
            discover_repositories,
            get_file_content,
            get_detailed_branches
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}