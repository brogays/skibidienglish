import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const feed = document.getElementById("community-feed");
const postForm = document.getElementById("post-form");
const postBody = document.getElementById("post-body");
const postSubmit = document.getElementById("post-submit");
const socialStatus = document.getElementById("social-status");
const messagesPanel = document.getElementById("community-messages-panel");
const feedPanel = document.getElementById("community-feed-panel");
const contactSearch = document.getElementById("contact-search");
const contactResults = document.getElementById("contact-results");
const conversationList = document.getElementById("conversation-list");
const chatPlaceholder = document.getElementById("chat-placeholder");
const chatConversation = document.getElementById("chat-conversation");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatBody = document.getElementById("chat-body");
const chatSubmit = document.getElementById("chat-submit");

const POST_LIMIT = 30;
const MESSAGE_LIMIT = 60;
const COMMENT_LIMIT = 40;
const TAGS = new Set(["Từ vựng", "Ngữ pháp", "IELTS", "THPT Quốc gia", "Động lực"]);
let currentUser = null;
let currentDisplayName = "";
let authGeneration = 0;
let posts = [];
let conversations = [];
let activeConversation = null;
let profileCache = new Map();
let likedPosts = new Set();
let checkedLikes = new Set();
let openCommentPosts = new Set();
const commentsByPost = new Map();
const unsubscribers = new Set();
const commentUnsubscribers = new Map();
let messagesUnsubscribe = null;
let searchTimer = 0;
let searchGeneration = 0;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function displayNameFor(user) {
  const name = String(user.displayName || user.email?.split("@")[0] || "").trim().slice(0, 80);
  return name.length >= 2 ? name : "Học viên";
}

function initialsFor(name) {
  return String(name || "Học viên").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "HV";
}

function setStatus(message, isError = false) {
  socialStatus.textContent = message;
  socialStatus.classList.toggle("error", isError);
}

function formatTime(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp instanceof Date ? timestamp : null;
  if (!date || Number.isNaN(date.getTime())) return "Vừa xong";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function updateComposerIdentity() {
  const avatar = document.getElementById("composer-avatar");
  const name = document.getElementById("composer-name");
  avatar.textContent = initialsFor(currentDisplayName);
  name.textContent = currentDisplayName || "Học viên";
}

function clearSocialSubscriptions() {
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers.clear();
  for (const unsubscribe of commentUnsubscribers.values()) unsubscribe();
  commentUnsubscribers.clear();
  if (messagesUnsubscribe) messagesUnsubscribe();
  messagesUnsubscribe = null;
  posts = [];
  conversations = [];
  activeConversation = null;
  profileCache = new Map();
  likedPosts = new Set();
  checkedLikes = new Set();
  openCommentPosts = new Set();
  commentsByPost.clear();
}

function subscribeToPosts(generation) {
  const postsQuery = query(collection(db, "communityPosts"), orderBy("createdAt", "desc"), limit(POST_LIMIT));
  const unsubscribe = onSnapshot(postsQuery, snapshot => {
    if (generation !== authGeneration || !currentUser) return;
    posts = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    const activeIds = new Set(posts.map(post => post.id));
    for (const [postId, stop] of commentUnsubscribers) {
      if (!activeIds.has(postId)) {
        stop();
        commentUnsubscribers.delete(postId);
        openCommentPosts.delete(postId);
        commentsByPost.delete(postId);
      }
    }
    renderPosts();
    for (const post of posts) loadCurrentUserLike(post.id, generation);
    setStatus(posts.length ? `Đang hiển thị ${posts.length} bài viết mới nhất.` : "Chưa có bài viết nào. Hãy chia sẻ điều đầu tiên nhé.");
  }, error => {
    if (generation === authGeneration) setStatus(`Không tải được bảng tin: ${error.message}`, true);
  });
  unsubscribers.add(unsubscribe);
}

function subscribeToConversations(generation) {
  const conversationsQuery = query(
    collection(db, "conversations"),
    where("memberIds", "array-contains", currentUser.uid),
    orderBy("updatedAt", "desc"),
    limit(50)
  );
  const unsubscribe = onSnapshot(conversationsQuery, snapshot => {
    if (generation !== authGeneration || !currentUser) return;
    conversations = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(conversation => Array.isArray(conversation.memberIds)
        && conversation.memberIds.length === 2
        && conversation.memberIds.includes(currentUser.uid))
      .sort((left, right) => (right.updatedAt?.toMillis?.() || 0) - (left.updatedAt?.toMillis?.() || 0));
    for (const conversation of conversations) {
      const otherUserId = conversation.memberIds.find(memberId => memberId !== currentUser.uid);
      if (otherUserId) loadPublicProfile(otherUserId, generation);
    }
    renderConversationList();
  }, error => {
    if (generation === authGeneration) setStatus(`Không tải được danh sách trò chuyện: ${error.message}`, true);
  });
  unsubscribers.add(unsubscribe);
}

async function loadCurrentUserLike(postId, generation) {
  if (checkedLikes.has(postId) || !currentUser) return;
  checkedLikes.add(postId);
  try {
    const likeSnapshot = await getDoc(doc(db, "communityPosts", postId, "likes", currentUser.uid));
    if (generation !== authGeneration || !currentUser) return;
    if (likeSnapshot.exists()) likedPosts.add(postId);
    else likedPosts.delete(postId);
    renderPosts();
  } catch (error) {
    if (generation === authGeneration) setStatus(`Không tải được trạng thái lượt thích: ${error.message}`, true);
  }
}

async function loadPublicProfile(userId, generation = authGeneration) {
  if (profileCache.has(userId) || !currentUser) return profileCache.get(userId) || null;
  profileCache.set(userId, { displayName: "Học viên", loading: true });
  try {
    const profileSnapshot = await getDoc(doc(db, "publicProfiles", userId));
    if (generation !== authGeneration || !currentUser) return null;
    const profile = profileSnapshot.exists()
      ? { displayName: String(profileSnapshot.data().displayName || "Học viên") }
      : { displayName: "Học viên" };
    profileCache.set(userId, profile);
    renderConversationList();
    if (activeConversation?.otherUserId === userId) updateChatIdentity(profile.displayName);
    return profile;
  } catch (error) {
    profileCache.delete(userId);
    if (generation === authGeneration) setStatus(`Không tải được hồ sơ học viên: ${error.message}`, true);
    return null;
  }
}

function renderPosts() {
  if (!currentUser) {
    feed.innerHTML = `<div class="empty-state">Đăng nhập để xem bài viết và chia sẻ cùng cộng đồng. <a href="auth.html">Đăng nhập ngay ↗</a></div>`;
    return;
  }
  if (!posts.length) {
    feed.innerHTML = `<div class="empty-state">Bảng tin đang trống. Bài viết của bạn sẽ xuất hiện ở đây.</div>`;
    return;
  }
  feed.innerHTML = posts.map(post => {
    const isLiked = likedPosts.has(post.id);
    const commentsState = commentsByPost.get(post.id);
    const commentsMarkup = openCommentPosts.has(post.id)
      ? renderComments(post.id, commentsState)
      : "";
    return `<article class="tip-card social-post" data-post-id="${escapeHTML(post.id)}">
      <header class="tip-author">
        <span class="tip-avatar">${escapeHTML(initialsFor(post.authorName))}</span>
        <span class="post-author-copy"><b>${escapeHTML(post.authorName || "Học viên")}</b><small>${escapeHTML(formatTime(post.createdAt))}</small></span>
        <span class="tip-tag">${escapeHTML(TAGS.has(post.tag) ? post.tag : "Chia sẻ")}</span>
      </header>
      <p class="post-body">${escapeHTML(post.body || "")}</p>
      <div class="tip-actions">
        <button type="button" class="${isLiked ? "liked" : ""}" data-like-post="${escapeHTML(post.id)}" aria-pressed="${isLiked}">${isLiked ? "♥ Đã thích" : "♡ Thích"}</button>
        <button type="button" data-toggle-comments="${escapeHTML(post.id)}" aria-expanded="${openCommentPosts.has(post.id)}">${openCommentPosts.has(post.id) ? "Ẩn bình luận" : "Bình luận"}</button>
      </div>
      ${commentsMarkup}
    </article>`;
  }).join("");
}

function renderComments(postId, state) {
  if (!state || state.loading) return `<div class="comments-area"><p class="social-inline-status">Đang tải bình luận…</p></div>`;
  if (state.error) return `<div class="comments-area"><p class="social-inline-status error">${escapeHTML(state.error)}</p></div>`;
  const commentsMarkup = state.comments.length
    ? state.comments.map(comment => `<article class="comment-item">
        <span class="tip-avatar comment-avatar">${escapeHTML(initialsFor(comment.authorName))}</span>
        <div class="comment-bubble"><div class="comment-meta"><b>${escapeHTML(comment.authorName || "Học viên")}</b><time>${escapeHTML(formatTime(comment.createdAt))}</time></div><p>${escapeHTML(comment.body || "")}</p></div>
        ${comment.authorId === currentUser?.uid ? `<button class="comment-delete" type="button" data-delete-comment="${escapeHTML(comment.id)}" data-comment-post="${escapeHTML(postId)}" aria-label="Xóa bình luận">×</button>` : ""}
      </article>`).join("")
    : `<p class="social-inline-status">Chưa có bình luận. Hãy mở đầu cuộc trò chuyện nhé.</p>`;
  return `<div class="comments-area"><div class="comment-list">${commentsMarkup}</div>
    <form class="comment-form" data-comment-form="${escapeHTML(postId)}">
      <label class="sr-only" for="comment-${escapeHTML(postId)}">Viết bình luận</label>
      <input id="comment-${escapeHTML(postId)}" name="body" maxlength="500" placeholder="Viết bình luận…" required>
      <button type="submit" aria-label="Gửi bình luận">Gửi</button>
    </form>
  </div>`;
}

function subscribeToComments(postId) {
  commentsByPost.set(postId, { loading: true, comments: [] });
  renderPosts();
  const commentsQuery = query(
    collection(db, "communityPosts", postId, "comments"),
    orderBy("createdAt", "asc"),
    limit(COMMENT_LIMIT)
  );
  const unsubscribe = onSnapshot(commentsQuery, snapshot => {
    if (!openCommentPosts.has(postId) || !currentUser) return;
    commentsByPost.set(postId, {
      loading: false,
      comments: snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    });
    renderPosts();
  }, error => {
    commentsByPost.set(postId, { loading: false, error: error.message, comments: [] });
    setStatus(`Không tải được bình luận: ${error.message}`, true);
    renderPosts();
  });
  commentUnsubscribers.set(postId, unsubscribe);
}

function renderConversationList() {
  if (!currentUser) {
    conversationList.innerHTML = `<p class="social-inline-status">Đăng nhập để xem tin nhắn.</p>`;
    return;
  }
  if (!conversations.length) {
    conversationList.innerHTML = `<p class="social-inline-status">Chưa có cuộc trò chuyện nào.</p>`;
    return;
  }
  conversationList.innerHTML = conversations.map(conversation => {
    const otherUserId = conversation.memberIds.find(memberId => memberId !== currentUser.uid);
    const name = profileCache.get(otherUserId)?.displayName || "Học viên";
    return `<button type="button" class="conversation-item ${activeConversation?.id === conversation.id ? "active" : ""}" data-conversation-id="${escapeHTML(conversation.id)}" data-other-user-id="${escapeHTML(otherUserId)}">
      <span class="social-avatar">${escapeHTML(initialsFor(name))}</span>
      <span class="conversation-copy"><b>${escapeHTML(name)}</b><small>${escapeHTML(conversation.lastMessage || "Bắt đầu trò chuyện")}</small></span>
      <time>${escapeHTML(formatTime(conversation.updatedAt))}</time>
    </button>`;
  }).join("");
}

function updateChatIdentity(name) {
  document.getElementById("chat-name").textContent = name;
  document.getElementById("chat-avatar").textContent = initialsFor(name);
}

function renderMessages(messages) {
  if (!activeConversation) {
    chatPlaceholder.hidden = false;
    chatConversation.hidden = true;
    chatMessages.innerHTML = "";
    return;
  }
  chatPlaceholder.hidden = true;
  chatConversation.hidden = false;
  if (!messages.length) {
    chatMessages.innerHTML = `<p class="chat-empty">Bắt đầu cuộc trò chuyện bằng một lời chào nhé.</p>`;
    return;
  }
  chatMessages.innerHTML = messages.map(message => {
    const own = message.senderId === currentUser?.uid;
    return `<article class="chat-message ${own ? "own" : ""}">
      ${own ? "" : `<b>${escapeHTML(message.senderName || "Học viên")}</b>`}
      <p>${escapeHTML(message.body || "")}</p>
      <time>${escapeHTML(formatTime(message.createdAt))}</time>
    </article>`;
  }).join("");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function subscribeToMessages(conversationId, generation) {
  if (messagesUnsubscribe) messagesUnsubscribe();
  chatMessages.innerHTML = `<p class="chat-empty">Đang tải tin nhắn…</p>`;
  const messagesQuery = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "desc"),
    limit(MESSAGE_LIMIT)
  );
  messagesUnsubscribe = onSnapshot(messagesQuery, snapshot => {
    if (generation !== authGeneration || activeConversation?.id !== conversationId) return;
    const messages = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).reverse();
    renderMessages(messages);
  }, error => {
    if (generation === authGeneration) {
      chatMessages.innerHTML = `<p class="chat-empty error">Không tải được tin nhắn: ${escapeHTML(error.message)}</p>`;
    }
  });
}

async function openConversation(conversationId, otherUserId, knownConversation = null) {
  if (!currentUser || otherUserId === currentUser.uid) return;
  const generation = authGeneration;
  const memberIds = [currentUser.uid, otherUserId].sort();
  const deterministicId = `${memberIds[0]}_${memberIds[1]}`;
  const conversationRef = doc(db, "conversations", conversationId || deterministicId);
  try {
    if (!knownConversation) {
      try {
        await setDoc(conversationRef, {
          memberIds,
          lastMessage: "",
          lastSenderId: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        if (error.code !== "permission-denied") throw error;
        const existingConversation = await getDoc(conversationRef);
        const existingMembers = existingConversation.data()?.memberIds;
        if (!existingConversation.exists()
          || !Array.isArray(existingMembers)
          || existingMembers.length !== 2
          || existingMembers[0] !== memberIds[0]
          || existingMembers[1] !== memberIds[1]) {
          throw error;
        }
      }
    }
    if (generation !== authGeneration || !currentUser) return;
    const profile = await loadPublicProfile(otherUserId, generation);
    if (generation !== authGeneration || !currentUser) return;
    activeConversation = {
      id: conversationRef.id,
      otherUserId,
      memberIds,
      lastMessage: knownConversation?.lastMessage || ""
    };
    updateChatIdentity(profile?.displayName || "Học viên");
    renderConversationList();
    subscribeToMessages(activeConversation.id, generation);
    if (window.innerWidth <= 760) messagesPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(`Không thể mở cuộc trò chuyện: ${error.message}`, true);
  }
}

function renderContactResults(results, generation) {
  if (generation !== searchGeneration) return;
  const profiles = results.filter(profile => profile.uid !== currentUser?.uid);
  contactResults.innerHTML = profiles.length
    ? profiles.map(profile => `<button type="button" class="contact-item" data-contact-id="${escapeHTML(profile.uid)}">
        <span class="social-avatar">${escapeHTML(initialsFor(profile.displayName))}</span><span><b>${escapeHTML(profile.displayName)}</b><small>Học viên Lingua Quest</small></span><span aria-hidden="true">↗</span>
      </button>`).join("")
    : `<p class="social-inline-status">${currentUser ? "Không tìm thấy học viên phù hợp." : "Đăng nhập để tìm học viên."}</p>`;
}

async function searchContacts(value) {
  const generation = ++searchGeneration;
  const search = value.trim().toLocaleLowerCase("vi");
  contactResults.innerHTML = "";
  if (!currentUser || search.length < 2) {
    document.getElementById("contact-search-hint").textContent = "Nhập ít nhất 2 ký tự để tìm học viên.";
    return;
  }
  document.getElementById("contact-search-hint").textContent = "Đang tìm học viên…";
  try {
    const profilesQuery = query(
      collection(db, "publicProfiles"),
      where("displayNameLower", ">=", search),
      where("displayNameLower", "<=", `${search}\uf8ff`),
      orderBy("displayNameLower"),
      limit(20)
    );
    const snapshot = await importProfiles(profilesQuery);
    if (generation !== searchGeneration) return;
    const results = snapshot.docs.map(item => {
      const profile = { uid: item.id, displayName: String(item.data().displayName || "Học viên") };
      profileCache.set(item.id, { displayName: profile.displayName });
      return profile;
    });
    document.getElementById("contact-search-hint").textContent = `${results.filter(profile => profile.uid !== currentUser?.uid).length} học viên phù hợp.`;
    renderContactResults(results, generation);
  } catch (error) {
    if (generation === searchGeneration) {
      document.getElementById("contact-search-hint").textContent = "Tìm kiếm học viên thất bại.";
      setStatus(`Không tìm được học viên: ${error.message}`, true);
    }
  }
}

async function importProfiles(profilesQuery) {
  return getDocs(profilesQuery);
}

document.querySelectorAll("[data-social-tab]").forEach(button => {
  button.addEventListener("click", () => {
    const showMessages = button.dataset.socialTab === "messages";
    document.querySelectorAll("[data-social-tab]").forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    feedPanel.hidden = showMessages;
    messagesPanel.hidden = !showMessages;
    feedPanel.classList.toggle("active", !showMessages);
    messagesPanel.classList.toggle("active", showMessages);
  });
});

postBody.addEventListener("input", () => {
  document.getElementById("post-character-count").textContent = `${postBody.value.length}/2000`;
});

postForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser) {
    setStatus("Hãy đăng nhập để đăng bài.", true);
    return;
  }
  const body = postBody.value.trim();
  const tag = document.getElementById("post-tag").value;
  if (!body || body.length > 2000 || !TAGS.has(tag)) {
    setStatus("Bài viết cần có nội dung hợp lệ (tối đa 2000 ký tự).", true);
    return;
  }
  postSubmit.disabled = true;
  try {
    await addDoc(collection(db, "communityPosts"), {
      authorId: currentUser.uid,
      authorName: currentDisplayName,
      body,
      tag,
      createdAt: serverTimestamp()
    });
    postForm.reset();
    document.getElementById("post-character-count").textContent = "0/2000";
    setStatus("Bài viết đã được chia sẻ với cộng đồng.");
  } catch (error) {
    setStatus(`Không đăng được bài viết: ${error.message}`, true);
  } finally {
    postSubmit.disabled = !currentUser;
  }
});

feed.addEventListener("click", async event => {
  const likeButton = event.target.closest("[data-like-post]");
  if (likeButton && currentUser) {
    const postId = likeButton.dataset.likePost;
    const likeRef = doc(db, "communityPosts", postId, "likes", currentUser.uid);
    likeButton.disabled = true;
    try {
      if (likedPosts.has(postId)) await deleteDoc(likeRef);
      else await setDoc(likeRef, { createdAt: serverTimestamp() });
      if (likedPosts.has(postId)) likedPosts.delete(postId);
      else likedPosts.add(postId);
      renderPosts();
    } catch (error) {
      setStatus(`Không cập nhật được lượt thích: ${error.message}`, true);
      likeButton.disabled = false;
    }
    return;
  }
  const toggleButton = event.target.closest("[data-toggle-comments]");
  if (toggleButton && currentUser) {
    const postId = toggleButton.dataset.toggleComments;
    if (openCommentPosts.has(postId)) {
      openCommentPosts.delete(postId);
      commentUnsubscribers.get(postId)?.();
      commentUnsubscribers.delete(postId);
      commentsByPost.delete(postId);
      renderPosts();
    } else {
      openCommentPosts.add(postId);
      subscribeToComments(postId);
    }
  }
  const deleteCommentButton = event.target.closest("[data-delete-comment]");
  if (deleteCommentButton && currentUser) {
    const { commentPost: postId, deleteComment: commentId } = deleteCommentButton.dataset;
    deleteCommentButton.disabled = true;
    try {
      await deleteDoc(doc(db, "communityPosts", postId, "comments", commentId));
    } catch (error) {
      setStatus(`Không xóa được bình luận: ${error.message}`, true);
      deleteCommentButton.disabled = false;
    }
    return;
  }
});

messagesPanel.addEventListener("click", async event => {
  const conversationButton = event.target.closest("[data-conversation-id]");
  if (conversationButton) {
    const conversation = conversations.find(item => item.id === conversationButton.dataset.conversationId);
    if (conversation) {
      const otherUserId = conversation.memberIds.find(memberId => memberId !== currentUser?.uid);
      openConversation(conversation.id, otherUserId, conversation);
    }
    return;
  }
  const contactButton = event.target.closest("[data-contact-id]");
  if (contactButton && currentUser) {
    contactButton.disabled = true;
    const otherUserId = contactButton.dataset.contactId;
    const existingConversation = conversations.find(item => item.memberIds.includes(otherUserId));
    await openConversation(existingConversation?.id || "", otherUserId, existingConversation || null);
    contactButton.disabled = false;
  }
});

feed.addEventListener("submit", async event => {
  const form = event.target.closest("[data-comment-form]");
  if (!form || !currentUser) return;
  event.preventDefault();
  const body = String(new FormData(form).get("body") || "").trim();
  if (!body || body.length > 500) return;
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    await addDoc(collection(db, "communityPosts", form.dataset.commentForm, "comments"), {
      authorId: currentUser.uid,
      authorName: currentDisplayName,
      body,
      createdAt: serverTimestamp()
    });
    form.reset();
  } catch (error) {
    setStatus(`Không gửi được bình luận: ${error.message}`, true);
  } finally {
    button.disabled = !currentUser;
  }
});

contactSearch.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchContacts(contactSearch.value), 250);
});

chatForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser || !activeConversation) {
    setStatus("Hãy chọn một cuộc trò chuyện trước.", true);
    return;
  }
  const body = chatBody.value.trim();
  if (!body || body.length > 1000) return;
  chatSubmit.disabled = true;
  const conversationRef = doc(db, "conversations", activeConversation.id);
  const messageRef = doc(collection(db, "conversations", activeConversation.id, "messages"));
  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderId: currentUser.uid,
    senderName: currentDisplayName,
    body,
    createdAt: serverTimestamp()
  });
  batch.update(conversationRef, {
    lastMessage: body.slice(0, 160),
    lastSenderId: currentUser.uid,
    updatedAt: serverTimestamp()
  });
  try {
    await batch.commit();
    chatForm.reset();
  } catch (error) {
    setStatus(`Không gửi được tin nhắn: ${error.message}`, true);
  } finally {
    chatSubmit.disabled = !currentUser;
    chatBody.focus();
  }
});

document.querySelectorAll("[data-social-tab]").forEach(button => {
  button.tabIndex = button.getAttribute("aria-selected") === "true" ? 0 : -1;
});

onAuthStateChanged(auth, async user => {
  const generation = ++authGeneration;
  searchGeneration += 1;
  clearTimeout(searchTimer);
  contactSearch.value = "";
  contactResults.innerHTML = "";
  clearSocialSubscriptions();
  currentUser = user;
  currentDisplayName = user ? displayNameFor(user) : "";
  updateComposerIdentity();
  renderPosts();
  renderConversationList();
  renderMessages([]);
  postSubmit.disabled = !user;
  chatSubmit.disabled = !user;
  document.getElementById("contact-search-hint").textContent = user
    ? "Nhập ít nhất 2 ký tự để tìm học viên."
    : "Đăng nhập để tìm học viên.";
  if (!user) {
    setStatus("Đăng nhập để xem bài viết và trò chuyện cùng học viên khác.");
    renderContactResults([], searchGeneration);
    return;
  }

  setStatus("Đang kết nối bảng tin và tin nhắn…");
  try {
    const displayNameLower = currentDisplayName.toLocaleLowerCase("vi");
    await setDoc(doc(db, "publicProfiles", user.uid), {
      displayName: currentDisplayName,
      displayNameLower,
      updatedAt: serverTimestamp()
    }, { merge: true });
    if (generation !== authGeneration || !currentUser) return;
    profileCache.set(user.uid, { displayName: currentDisplayName });
    subscribeToPosts(generation);
    subscribeToConversations(generation);
  } catch (error) {
    if (generation === authGeneration) {
      setStatus(`Không thể khởi tạo cộng đồng: ${error.message}`, true);
      renderContactResults([], searchGeneration);
    }
  }
}, error => {
  clearSocialSubscriptions();
  currentUser = null;
  currentDisplayName = "";
  updateComposerIdentity();
  renderPosts();
  renderConversationList();
  renderMessages([]);
  postSubmit.disabled = true;
  chatSubmit.disabled = true;
  setStatus(`Không xác định được tài khoản: ${error.message}`, true);
});
