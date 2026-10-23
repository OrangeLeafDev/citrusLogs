import express from 'express';
import fs from 'node:fs/promises';
import matter from 'gray-matter';
import { marked } from 'marked';

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

const CONTENT_DIR = './content';

// Reads all category folders and their posts in one pass
async function getContentTree() {
    const categories = [];
    const allPosts = [];

    try {
        const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const catSlug = entry.name;
            const catPath = `${CONTENT_DIR}/${catSlug}`;
            const files = await fs.readdir(catPath);

            // 1. Parse Category Metadata from _index.md (if it exists)
            let catData = { name: catSlug, group: 'general', description: '', thumbnail: '#' };
            let catHtml = '';

            if (files.includes('_index.md')) {
                const rawCat = await fs.readFile(`${catPath}/_index.md`, 'utf-8');
                const parsedCat = matter(rawCat);
                catData = {
                    name: parsedCat.data.name || catSlug,
                    // Supports either 'category:' or 'group:' in _index.md frontmatter
                    group: parsedCat.data.category || parsedCat.data.group || 'general',
                    description: parsedCat.data.description || '',
                    thumbnail: parsedCat.data.thumbnail || '#'
                };
                catHtml = marked.parse(parsedCat.content);
            }

            // 2. Parse all other .md files in this folder as Posts
            const catPosts = [];
            for (const file of files) {
                if (!file.endsWith('.md') || file === '_index.md') continue;

                const postSlug = file.replace('.md', '');
                const rawPost = await fs.readFile(`${catPath}/${file}`, 'utf-8');
                const { data, content } = matter(rawPost);

                const postObj = {
                    slug: postSlug,
                    category: catSlug,
                    categoryName: catData.name,
                    url: `/${catSlug}/${postSlug}`,
                    title: data.title || postSlug,
                    description: data.description || '',
                    author: data.author || 'orangeleaf36',
                    date: data.date || 'Unknown Date',
                    thumbnail: data.thumbnail || null,
                    htmlContent: marked.parse(content)
                };

                catPosts.push(postObj);
                allPosts.push(postObj);
            }

            // Sort posts inside this category newest-first
            catPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

            categories.push({
                slug: catSlug,
                ...catData,
                htmlContent: catHtml,
                posts: catPosts,
                latestPost: catPosts[0] || null
            });
        }
    } catch (err) {
        console.error('Error reading content directory:', err);
    }

    return { categories, allPosts };
}

// 1. HUB ROUTE: example.com/
app.get('/', async (req, res) => {
    const { categories } = await getContentTree();
    // Dynamically grab all unique category groups ('general', 'projects', 'misc', etc.)
    const groups = [...new Set(categories.map(c => c.group))];
    res.render('hub', { categories, groups, isEmbedded: false });
});

// 2. CATEGORY ROUTE: example.com/:category
app.get('/:category', async (req, res) => {
    const { categories } = await getContentTree();
    const category = categories.find(c => c.slug === req.params.category);

    if (!category) return res.status(404).send('Category not found');

    res.render('category', { category, posts: category.posts, isEmbedded: false });
});

// 3. POST ROUTE: example.com/:category/:post
app.get('/:category/:post', async (req, res) => {
    const { categories } = await getContentTree();
    const category = categories.find(c => c.slug === req.params.category);

    if (!category) return res.status(404).send('Category not found');

    const post = category.posts.find(p => p.slug === req.params.post);
    if (!post) return res.status(404).send('Post not found');

    const isEmbedded = req.query.embed === 'true';
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    res.render('post', { post, isEmbedded });
});

app.listen(3000, () => console.log('citrusLogs running on http://localhost:3000/'));