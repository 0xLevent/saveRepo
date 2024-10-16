document.addEventListener('DOMContentLoaded', () => {
    const postForm = document.getElementById('postForm');
    const postsContainer = document.getElementById('posts');
    const usernameSpan = document.getElementById('username');
    const logoutButton = document.getElementById('logoutButton');

    loadUserInfo();
    loadPosts();

    postForm.addEventListener('submit', createPost);
    logoutButton.addEventListener('click', logout);

    function loadUserInfo() {
        const token = localStorage.getItem('token');
        if (token) {
            fetch('/api/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(user => {
                usernameSpan.textContent = user.username;
            })
            .catch(error => console.error('Error:', error));
        }
    }

    function logout() {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    }

    async function loadPosts() {
        try {
            const response = await fetch('/api/posts');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const posts = await response.json();
            displayPosts(posts);
        } catch (error) {
            console.error('Error:', error);
            alert('Postları yükleme hatası: ' + error.message);
        }
    }

    function displayPosts(posts) {
        const postsContainer = document.getElementById('postsContainer');
        postsContainer.innerHTML = '';
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('post');
            postElement.innerHTML = `
                <div class="post-header">
                    <span class="post-username">${post.userId ? post.userId.username : 'Anonim'}</span>
                    <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                </div>
                <p class="post-content">${post.content}</p>
                <div class="post-actions">
                    <button class="like-button" data-post-id="${post._id}">Beğen (${post.likes ? post.likes.length : 0})</button>
                    <button class="comment-button" data-post-id="${post._id}">Yorum Yap</button>
                </div>
                <div class="comments">
                    ${post.comments ? post.comments.map(comment => `
                        <div class="comment">
                            <strong>${comment.userId ? comment.userId.username : 'Anonim'}</strong>: ${comment.content}
                        </div>
                    `).join('') : ''}
                </div>
                <form class="comment-form" data-post-id="${post._id}">
                    <input type="text" placeholder="Yorum yaz" required>
                    <button type="submit">Gönder</button>
                </form>
            `;
            
            postsContainer.appendChild(postElement);
        });
    
        // Beğeni ve yorum butonları için event listener'ları ekleyin
        document.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', () => likePost(button.dataset.postId));
        });
    
        document.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const postId = form.dataset.postId;
                const content = form.querySelector('input').value;
                addComment(postId, content);
                form.reset();
            });
        });
    }

    async function createPost(e) {
        e.preventDefault();
        const content = document.getElementById('postContent').value;
        const token = localStorage.getItem('token');

        if (!token) {
            alert('Lütfen giriş yapın');
            return;
        }

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            document.getElementById('postContent').value = '';
            loadPosts();
        } catch (error) {
            console.error('Error:', error);
            alert('Post oluşturma hatası: ' + error.message);
        }
    }

    async function likePost(postId) {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Lütfen giriş yapın');
            return;
        }

        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            loadPosts();
        } catch (error) {
            console.error('Error:', error);
            alert('Beğeni hatası: ' + error.message);
        }
    }

    async function addComment(postId, content) {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Lütfen giriş yapın');
            return;
        }

        try {
            const response = await fetch(`/api/posts/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            loadPosts();
        } catch (error) {
            console.error('Error:', error);
            alert('Yorum ekleme hatası: ' + error.message);
        }
    }
});