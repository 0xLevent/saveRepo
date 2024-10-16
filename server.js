const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const User = require('./models/User');
const Post = require('./models/Post');
const authenticateToken = require('./middleware/auth');

const app = express();

const JWT_SECRET = 'key'; 
const MONGODB_URI = 'URL'; 

app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
    }
}));app.use(express.json());

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB bağlantısı başarılı'))
.catch((err) => console.error('MongoDB bağlantı hatası:', err));

app.post('/api/register', async (req, res) => {
    const { email, password, username } = req.body;
    
    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) return res.status(400).json({ message: 'Email veya kullanıcı adı kullanılıyor' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword, username });
        await newUser.save();
        
        res.status(201).json({ message: 'Kayıt başarılı' });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Kullanıcı bulunamadı' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Geçersiz şifre' });
        
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
        
        res.status(200).json({
            token,
            user: { id: user._id, email: user.email, username: user.username }
        });
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const newPost = new Post({ userId: req.user.userId, content });
        await newPost.save();
        
        const populatedPost = await Post.findById(newPost._id).populate('userId', 'username');
        res.status(201).json(populatedPost);
    } catch (error) {
        res.status(500).json({ message: 'Post oluşturma hatası', error: error.message });
    }
});

app.get('/api/posts', async (req, res) => {
    console.log('GET /api/posts isteği alındı');
    try {
        const posts = await Post.find()
            .populate('userId', 'username')
            .populate('comments.userId', 'username')
            .sort({ createdAt: -1 });
        console.log(`${posts.length} post bulundu`);
        
        const filteredPosts = posts.filter(post => post.userId);
        res.json(filteredPosts);
    } catch (error) {
        console.error('Postları getirme hatası:', error);
        res.status(500).json({ message: 'Postları getirme hatası', error: error.message });
    }
});

app.post('/api/posts/:postId/like', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Post bulunamadı' });

        const likeIndex = post.likes.indexOf(req.user.userId);
        if (likeIndex > -1) {
            // Unlike
            post.likes.splice(likeIndex, 1);
        } else {
            // Like
            post.likes.push(req.user.userId);
        }

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: 'Beğeni işlemi hatası', error: error.message });
    }
});

app.post('/api/posts/:postId/comment', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Post bulunamadı' });

        post.comments.push({ userId: req.user.userId, content });
        await post.save();

        const updatedPost = await Post.findById(post._id)
            .populate('userId', 'username')
            .populate('comments.userId', 'username');
        res.json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: 'Yorum ekleme hatası', error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});