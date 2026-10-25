import express from 'express';
import fs from 'node:fs/promises';
import matter from 'gray-matter';
import { marked } from 'marked';

const app = express();
app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(express.static('public'));
app.use((req, res, next) => {
    res.locals.isEmbedded = req.query.embed === 'true';
    next();
});

function getMeta(req, title, description, type = 'website', image = null) {
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const baseUrl = `${protocol}://${req.get('host')}`;
    const formattedTitle = title ? `${title} - citrusLogs` : 'citrusLogs';
    let imageUrl = image && image !== '#' ? image : `${baseUrl}/citruslogs_logo2.png`;
    if (imageUrl.startsWith('/')) {
        imageUrl = `${baseUrl}${imageUrl}`;
    }
    return {
        title: formattedTitle,
        description: description || 'Welcome to citrusLogs',
        type: type,
        image: imageUrl,
        currentUrl: `${baseUrl}${req.originalUrl}`
    };
}

const CONTENT_DIR = './content';

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
                    author: data.author || 'unknown',
                    date: data.date || 'Unknown Date',
                    thumbnail: data.thumbnail || null,
                    htmlContent: marked.parse(content)
                };

                catPosts.push(postObj);
                allPosts.push(postObj);
            }
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

app.get('/', async (req, res) => {
    const { categories } = await getContentTree();
    const groups = [...new Set(categories.map(c => c.group))];
    const orderedGroups = groups.includes('general') 
        ? ['general', ...groups.filter(g => g !== 'general')]
        : groups;

    res.render('hub', { 
        categories, 
        orderedGroups, 
        meta: getMeta(req, 'Home', 'Orange\'s Writing Deposit') 
    });
});

app.get('/:category', async (req, res) => {
    const { categories } = await getContentTree();
    const category = categories.find(c => c.slug === req.params.category);

    if (!category) return res.status(404).send('Category not found');

    res.render('category', { 
        category, 
        posts: category.posts, 
        meta: getMeta(req, category.name, category.description, 'website', category.thumbnail) 
    });
});

app.get('/:category/:post', async (req, res) => {
    const { categories } = await getContentTree();
    const category = categories.find(c => c.slug === req.params.category);

    if (!category) return res.status(404).send('Category not found');

    const post = category.posts.find(p => p.slug === req.params.post);
    if (!post) return res.status(404).send('Post not found');

    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    res.render('post', { 
        post, 
        meta: getMeta(req, post.title, post.description, 'article', post.thumbnail) 
    });
});

app.listen(3000, () => console.log('citrusLogs running on http://localhost:3000/'));