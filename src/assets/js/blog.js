import BasePage from './base-page';

class Blog extends BasePage {
    onReady() {
        this.initPresentation();
        this.initToggleLike();
    }

    initPresentation() {
        if (salla.url.is_page('blog.index')) {
            this.initBlogIndex();
        }

        if (salla.url.is_page('blog.single')) {
            this.initBlogSingle();
        }
    }

    initBlogIndex() {
        const infiniteScroll = document.querySelector('salla-infinite-scroll');
        const categoriesSidebar = document.querySelector('[data-testid="store-blog-categories"]');
        const page = (categoriesSidebar || infiniteScroll)?.closest('.container');

        if (!page || page.dataset.trBlogReady === '1') {
            return;
        }

        page.dataset.trBlogReady = '1';
        page.classList.add('tr-blog-index');

        const mainContent = page.querySelector('.main-content');
        const layout = mainContent?.parentElement;

        if (!mainContent || !layout) {
            return;
        }

        this.buildBlogHub(page, layout);
        this.installCrawlableNextLink(infiniteScroll);
    }

    buildBlogHub(page, layout) {
        if (page.querySelector('.tr-hub')) {
            return;
        }

        const isArabic = (document.documentElement.lang || '').toLowerCase().startsWith('ar');
        const currentCategory =
            page.querySelector('#filters-menu li.text-primary a') ||
            page.querySelector('.cat-filter a.is-active');

        let heading = page.querySelector('.blog-category__title');

        if (heading) {
            heading.className = 'tr-hub-title';
        } else {
            heading = document.createElement('h1');
            heading.className = 'tr-hub-title';
            heading.textContent = currentCategory?.textContent?.trim() ||
                (isArabic ? 'مدونة تفاحة ريان التقنية' : 'Tafahat Rayan Tech Blog');
        }

        const hub = document.createElement('section');
        hub.className = 'tr-hub';

        const intro = document.createElement('div');
        intro.className = 'tr-hub-heading';
        intro.appendChild(heading);

        hub.appendChild(intro);

        const categoryLinks = [...page.querySelectorAll('#filters-menu a')];

        if (categoryLinks.length) {
            const topics = document.createElement('nav');
            topics.className = 'tr-topics';
            topics.setAttribute(
                'aria-label',
                isArabic ? 'تصنيفات المدونة' : 'Blog categories'
            );

            categoryLinks.forEach(link => {
                const cloned = link.cloneNode(true);
                cloned.className = 'tr-topic';

                if (
                    link.closest('li')?.classList.contains('text-primary') ||
                    link.classList.contains('is-active')
                ) {
                    cloned.classList.add('is-active');
                    cloned.setAttribute('aria-current', 'page');
                }

                topics.appendChild(cloned);
            });

            hub.appendChild(topics);
        }

        layout.before(hub);
    }

    installCrawlableNextLink(infiniteScroll) {
        if (!infiniteScroll || infiniteScroll.dataset.trPaginationReady === '1') {
            return;
        }

        infiniteScroll.dataset.trPaginationReady = '1';

        const nav = document.createElement('nav');
        nav.className = 'tr-crawl-pagination';

        const link = document.createElement('a');
        link.rel = 'next';
        nav.appendChild(link);

        const isArabic = (document.documentElement.lang || '').toLowerCase().startsWith('ar');
        link.textContent = isArabic ? 'الصفحة التالية' : 'Next page';

        const sync = () => {
            const nextPage = infiniteScroll.getAttribute('next-page');

            if (nextPage) {
                link.href = nextPage;
                nav.hidden = false;
            } else {
                nav.hidden = true;
                link.removeAttribute('href');
            }
        };

        sync();
        infiniteScroll.insertAdjacentElement('afterend', nav);

        new MutationObserver(sync).observe(infiniteScroll, {
            attributes: true,
            attributeFilter: ['next-page']
        });
    }

    initBlogSingle() {
        const likeButton = document.querySelector('#blog-like');
        const mainContent =
            likeButton?.closest('.main-content') ||
            document.querySelector('.main-content.blog-category');

        const page = mainContent?.closest('.container');

        if (!page || !mainContent || page.dataset.trBlogReady === '1') {
            return;
        }

        page.dataset.trBlogReady = '1';
        page.classList.add('tr-blog-single');
        mainContent.classList.add('tr-article-main');

        const layout = mainContent.parentElement;
        layout?.classList.add('tr-article-layout');

        const articleBody = [...mainContent.children].find(
            element => element.tagName === 'ARTICLE'
        );

        articleBody?.classList.add('tr-article-body');

        const related = layout?.querySelector('aside');
        related?.classList.add('tr-related');
    }

    initToggleLike() {
        const likeBtn = document.querySelector('#blog-like');

        if (!likeBtn || !salla.url.is_page('blog.single')) {
            return;
        }

        const blogId = likeBtn.dataset.blogId;
        const likedBlogs = JSON.parse(localStorage.getItem('liked_blogs')) || [];
        this.isLiked = likedBlogs.includes(blogId);

        if (this.isLiked) {
            likeBtn.classList.add('liked');
        }

        likeBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            if (salla.config.isGuest()) {
                return salla.notify.error(salla.lang.get('common.messages.must_login'));
            }

            const originalContent = likeBtn.innerHTML;
            likeBtn.querySelector('i').outerHTML = '<span class="loader loader--small"></span>';

            const endpoint = `blog/articles/${blogId}/like`;
            try {
                await salla.api.request(endpoint, '', this.isLiked ? 'delete' : 'put');
                likeBtn.innerHTML = originalContent;
                this.updateLikedBlogs(blogId, !this.isLiked);
                this.updateLikesCount(!this.isLiked);
                this.isLiked = !this.isLiked;
            } catch (e) {
                likeBtn.innerHTML = originalContent;
                if (e.response?.status === 409) {
                    this.handleExistingLike(likeBtn, blogId);
                }
            }
        });
    }

    handleExistingLike(likeBtn, blogId) {
        const isLiked = likeBtn.classList.contains('liked');
        this.updateLikedBlogs(blogId, !isLiked);
        this.updateLikesCount(!isLiked);
        this.isLiked = !isLiked;
    }

    updateLikedBlogs(blogId, add) {
        const likedBlogs = JSON.parse(localStorage.getItem('liked_blogs')) || [];
        const updatedBlogs = add ? [...likedBlogs, blogId] : likedBlogs.filter(id => id !== blogId);
        localStorage.setItem('liked_blogs', JSON.stringify(updatedBlogs));
    }

    updateLikesCount(isLiked) {
        const likeButton = document.querySelector('#blog-like');
        const countSpan = likeButton.querySelector('span');
        let currentCount = parseInt(countSpan?.innerText) || 0;

        likeButton.classList.toggle('liked', isLiked);

        anime({
            targets: countSpan,
            innerHTML: isLiked ? currentCount + 1 : currentCount - 1,
            duration: 400,
            round: 1,
            easing: 'easeOutExpo',
            complete: function () {
                countSpan.removeAttribute('style');
            }
        });

        anime({
            targets: countSpan,
            scale: [1, 1.2],
            duration: 300,
            easing: 'easeInOutQuad',
        });
    }
}

Blog.initiateWhenReady(['blog.single', 'blog.index']);
