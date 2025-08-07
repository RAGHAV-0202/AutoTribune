import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { RefreshCw, Newspaper, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

interface Article {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  published_at: string;
  slug: string;
}

const ARTICLES_PER_PAGE = 16; // Increased for smoother loading
const PRELOAD_THRESHOLD = 800; // Start loading 800px before bottom

const Index = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);
  const observerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const lastScrollY = useRef(0);
  const animationFrameRef = useRef<number>();
  const loadTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Smooth article reveal animation
  const revealArticles = useCallback((newArticles: Article[]) => {
    if (newArticles.length === 0) return;
    
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    // Batch reveal articles for smoother experience
    const batchSize = 4;
    let currentBatch = 0;
    
    const revealBatch = () => {
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, newArticles.length);
      const batch = newArticles.slice(start, end);
      
      if (batch.length > 0) {
        setDisplayedArticles(prev => [...prev, ...batch]);
        currentBatch++;
        
        if (end < newArticles.length) {
          loadTimeoutRef.current = setTimeout(revealBatch, 50);
        }
      }
    };
    
    // Start revealing with a small delay for smoothness
    loadTimeoutRef.current = setTimeout(revealBatch, 100);
  }, []);

  const fetchArticles = async (pageNum: number = 0, append: boolean = false) => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      
      if (!append) {
        setLoading(true);
        setDisplayedArticles([]);
      } else {
        setLoadingMore(true);
      }

      const from = pageNum * ARTICLES_PER_PAGE;
      const to = from + ARTICLES_PER_PAGE - 1;

      console.log(`Fetching articles: page ${pageNum}, from ${from} to ${to}`);

      const { data, error, count } = await supabase
        .from('articles')
        .select('*', { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching articles:', error);
        toast({
          title: "Error",
          description: "Failed to load articles",
          variant: "destructive",
        });
        return;
      }

      const newArticles = data || [];
      console.log(`Received ${newArticles.length} articles`);
      
      if (append) {
        setArticles(prev => {
          const existingIds = new Set(prev.map(article => article.id));
          const uniqueNewArticles = newArticles.filter(article => !existingIds.has(article.id));
          console.log(`Adding ${uniqueNewArticles.length} unique new articles`);
          const updated = [...prev, ...uniqueNewArticles];
          console.log(`Total articles after append: ${updated.length}`);
          
          // Smooth reveal of new articles
          revealArticles(uniqueNewArticles);
          
          return updated;
        });
      } else {
        setArticles(newArticles);
        setPage(0);
        // Smooth reveal of initial articles
        revealArticles(newArticles);
      }

      // Update hasMore status
      const totalLoaded = append ? 
        articles.length + newArticles.filter(article => 
          !articles.some(existing => existing.id === article.id)
        ).length : 
        newArticles.length;
      
      const hasMoreArticles = count ? totalLoaded < count : newArticles.length === ARTICLES_PER_PAGE;
      setHasMore(hasMoreArticles);
      
      console.log(`Has more articles: ${hasMoreArticles}, Total loaded: ${totalLoaded}, Total count: ${count}`);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  };

  // Optimized scroll handler with RAF
  const handleScroll = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      
      // Only check if scrolling down
      if (scrollY > lastScrollY.current) {
        const distanceFromBottom = scrollHeight - scrollY - clientHeight;
        
        if (
          distanceFromBottom <= PRELOAD_THRESHOLD &&
          !isLoadingRef.current &&
          !loadingMore &&
          hasMore &&
          !debouncedSearchQuery &&
          !loading
        ) {
          console.log('Scroll threshold reached - loading more articles');
          const nextPage = page + 1;
          setPage(nextPage);
          fetchArticles(nextPage, true);
        }
      }
      
      lastScrollY.current = scrollY;
    });
  }, [loadingMore, hasMore, page, debouncedSearchQuery, loading]);

  const loadMoreArticles = useCallback(() => {
    if (
      isLoadingRef.current || 
      loadingMore || 
      !hasMore || 
      debouncedSearchQuery || 
      loading
    ) {
      console.log('Skipping loadMore:', { 
        isLoading: isLoadingRef.current, 
        loadingMore, 
        hasMore, 
        searchQuery: !!debouncedSearchQuery,
        loading 
      });
      return;
    }

    const nextPage = page + 1;
    console.log(`Manual load more - Next page: ${nextPage}, Current articles: ${articles.length}`);
    setPage(nextPage);
    fetchArticles(nextPage, true);
  }, [loadingMore, hasMore, page, debouncedSearchQuery, loading, articles.length]);

  // Enhanced intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !debouncedSearchQuery) {
          console.log('Intersection triggered - loading more articles');
          loadMoreArticles();
        }
      },
      {
        threshold: 0.1,
        rootMargin: `${PRELOAD_THRESHOLD}px`,
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [loadMoreArticles, debouncedSearchQuery]);

  // Optimized scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  useEffect(() => {
    fetchArticles();
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  const handleArticleClick = (slug: string) => {
    navigate(`/article/${slug}`);
  };

  const handleRefresh = () => {
    setArticles([]);
    setDisplayedArticles([]);
    setPage(0);
    setHasMore(true);
    isLoadingRef.current = false;
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    fetchArticles();
  };

  // Use displayed articles for filtering to prevent layout jumps
  const filteredArticles = debouncedSearchQuery 
    ? displayedArticles.filter(article =>
        article.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      )
    : displayedArticles;

  // Enhanced dynamic sections with smooth transitions
  const createDynamicSections = (articles: Article[]) => {
    const sections = [];
    let currentIndex = 0;

    // First section - traditional layout
    if (articles.length > 0) {
      sections.push({
        type: 'initial',
        featured: articles[0] || null,
        large: articles.slice(1, 3),
        medium: articles.slice(3, 7),
        small: articles.slice(7, 11)
      });
      currentIndex = 11;
    }

    // Generate random layouts for remaining articles
    while (currentIndex < articles.length) {
      const remainingArticles = articles.slice(currentIndex);
      const batchSize = Math.min(8, remainingArticles.length);
      const batch = remainingArticles.slice(0, batchSize);
      
      if (batch.length === 0) break;

      // Weighted random patterns (some patterns more likely than others)
      const layoutPatterns = [
        // More common patterns (appear twice for higher probability)
        {
          type: 'mixed',
          featured: batch[0],
          large: batch.slice(1, 3),
          medium: batch.slice(3, 7),
          small: batch.slice(7, 8),
          weight: 2
        },
        {
          type: 'grid',
          medium: batch.slice(0, Math.min(8, batch.length)),
          weight: 2
        },
        // Less common patterns
        {
          type: 'highlight',
          large: batch.slice(0, 2),
          small: batch.slice(2, 8),
          weight: 1
        },
        {
          type: 'featured_mix',
          featured: batch[0],
          medium: batch.slice(1, 8),
          weight: 1
        },
        {
          type: 'compact',
          small: batch.slice(0, 8),
          weight: 1
        }
      ];

      // Weighted random selection
      const totalWeight = layoutPatterns.reduce((sum, pattern) => sum + pattern.weight, 0);
      let randomWeight = Math.random() * totalWeight;
      let selectedPattern = layoutPatterns[0];

      for (const pattern of layoutPatterns) {
        randomWeight -= pattern.weight;
        if (randomWeight <= 0) {
          selectedPattern = pattern;
          break;
        }
      }

      sections.push({
        ...selectedPattern,
        sectionIndex: sections.length
      });

      currentIndex += batchSize;
    }

    return {
      sections,
      sidebarArticles: articles.slice(11, 31)
    };
  };

  const { sections, sidebarArticles } = createDynamicSections(filteredArticles);

  // Enhanced section rendering with animations
  const renderSection = (section: any, index: number) => {
    const sectionKey = `section-${index}`;
    const animationDelay = index * 50; // Stagger animations
    
    const sectionClass = "opacity-0 animate-in fade-in duration-500 slide-in-from-bottom-4";
    const delayStyle = { animationDelay: `${animationDelay}ms` };
    
    if (section.type === 'initial') {
      return (
        <div 
          key={sectionKey} 
          className={`grid grid-cols-4 gap-4 auto-rows-max mb-8 ${sectionClass}`}
          style={delayStyle}
        >
          {section.featured && (
            <div className="opacity-0 animate-in fade-in duration-700 slide-in-from-left-4" style={{ animationDelay: `${animationDelay + 100}ms` }}>
              <ArticleCard
                key={section.featured.id}
                id={section.featured.id}
                title={section.featured.title}
                content={section.featured.content}
                image_url={section.featured.image_url}
                published_at={section.featured.published_at}
                slug={section.featured.slug}
                variant="featured"
                onClick={() => handleArticleClick(section.featured.slug)}
              />
            </div>
          )}
          
          {section.medium.slice(0, 2).map((article: Article, idx: number) => (
            <div 
              key={article.id}
              className="opacity-0 animate-in fade-in duration-700 slide-in-from-right-4" 
              style={{ animationDelay: `${animationDelay + 200 + (idx * 100)}ms` }}
            >
              <ArticleCard
                id={article.id}
                title={article.title}
                content={article.content}
                image_url={article.image_url}
                published_at={article.published_at}
                slug={article.slug}
                variant="medium"
                onClick={() => handleArticleClick(article.slug)}
              />
            </div>
          ))}
          
          {section.large.map((article: Article, idx: number) => (
            <div 
              key={article.id}
              className="opacity-0 animate-in fade-in duration-700 slide-in-from-bottom-4" 
              style={{ animationDelay: `${animationDelay + 400 + (idx * 100)}ms` }}
            >
              <ArticleCard
                id={article.id}
                title={article.title}
                content={article.content}
                image_url={article.image_url}
                published_at={article.published_at}
                slug={article.slug}
                variant="large"
                onClick={() => handleArticleClick(article.slug)}
              />
            </div>
          ))}
          
          {section.medium.slice(2).map((article: Article, idx: number) => (
            <div 
              key={article.id}
              className="opacity-0 animate-in fade-in duration-700 slide-in-from-top-4" 
              style={{ animationDelay: `${animationDelay + 600 + (idx * 100)}ms` }}
            >
              <ArticleCard
                id={article.id}
                title={article.title}
                content={article.content}
                image_url={article.image_url}
                published_at={article.published_at}
                slug={article.slug}
                variant="medium"
                onClick={() => handleArticleClick(article.slug)}
              />
            </div>
          ))}
          
          {section.small.length > 0 && (
            <div className="col-span-4 grid grid-cols-2 gap-4">
              {section.small.map((article: Article, idx: number) => (
                <div 
                  key={article.id}
                  className="opacity-0 animate-in fade-in duration-700 slide-in-from-bottom-4" 
                  style={{ animationDelay: `${animationDelay + 800 + (idx * 50)}ms` }}
                >
                  <ArticleCard
                    id={article.id}
                    title={article.title}
                    content={article.content}
                    image_url={article.image_url}
                    published_at={article.published_at}
                    slug={article.slug}
                    variant="small"
                    onClick={() => handleArticleClick(article.slug)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Simplified rendering for other patterns with animations
    const renderArticleWithAnimation = (article: Article, variant: string, idx: number, baseDelay: number) => (
      <div 
        key={article.id}
        className="opacity-0 animate-in fade-in duration-500 slide-in-from-bottom-2" 
        style={{ animationDelay: `${baseDelay + (idx * 50)}ms` }}
      >
        <ArticleCard
          id={article.id}
          title={article.title}
          content={article.content}
          image_url={article.image_url}
          published_at={article.published_at}
          slug={article.slug}
          variant={variant}
          onClick={() => handleArticleClick(article.slug)}
        />
      </div>
    );

    if (section.type === 'mixed') {
      return (
        <div key={sectionKey} className={`grid grid-cols-4 gap-4 auto-rows-max mb-8 ${sectionClass}`} style={delayStyle}>
          {section.featured && renderArticleWithAnimation(section.featured, 'featured', 0, animationDelay + 100)}
          {section.medium.slice(0, 2).map((article: Article, idx: number) => 
            renderArticleWithAnimation(article, 'medium', idx + 1, animationDelay + 100)
          )}
          {section.large.map((article: Article, idx: number) => 
            renderArticleWithAnimation(article, 'large', idx + 3, animationDelay + 100)
          )}
          {section.medium.slice(2).map((article: Article, idx: number) => 
            renderArticleWithAnimation(article, 'medium', idx + 5, animationDelay + 100)
          )}
          {section.small && section.small.length > 0 && (
            <div className="col-span-4 grid grid-cols-4 gap-4">
              {section.small.map((article: Article, idx: number) => 
                renderArticleWithAnimation(article, 'small', idx + 7, animationDelay + 100)
              )}
            </div>
          )}
        </div>
      );
    }

    if (section.type === 'grid') {
      return (
        <div key={sectionKey} className={`grid grid-cols-4 gap-4 mb-8 ${sectionClass}`} style={delayStyle}>
          {section.medium.map((article: Article, idx: number) => 
            renderArticleWithAnimation(article, 'medium', idx, animationDelay + 100)
          )}
        </div>
      );
    }

    if (section.type === 'highlight') {
      return (
        <div key={sectionKey} className={`grid grid-cols-4 gap-4 auto-rows-max mb-8 ${sectionClass}`} style={delayStyle}>
          {section.large.map((article: Article, idx: number) => 
            renderArticleWithAnimation(article, 'large', idx, animationDelay + 100)
          )}
          {section.small.length > 0 && (
            <div className="col-span-4 grid grid-cols-3 gap-4">
              {section.small.map((article: Article, idx: number) => 
                renderArticleWithAnimation(article, 'small', idx + 2, animationDelay + 100)
              )}
            </div>
          )}
        </div>
      );
    }

    if (section.type === 'featured_mix') {
      return (
        <div key={sectionKey} className={`grid grid-cols-4 gap-4 auto-rows-max mb-8 ${sectionClass}`} style={delayStyle}>
          {section.featured && renderArticleWithAnimation(section.featured, 'featured', 0, animationDelay + 100)}
          {section.medium.map((article: Article, idx: number) => 
            renderArticleWithAnimation(article, idx < 2 ? "medium" : "small", idx + 1, animationDelay + 100)
          )}
        </div>
      );
    }

    if (section.type === 'compact') {
      return (
        <div key={sectionKey} className={`grid grid-cols-4 gap-4 mb-8 ${sectionClass}`} style={delayStyle}>
          {section.small.map((article: Article, idx: number) => 
            renderArticleWithAnimation(article, 'small', idx, animationDelay + 100)
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-12 text-sm">
            <div className="flex items-center space-x-6">
              <span>WORLD</span>
              <span>PROFIT</span>
              <span>BQ</span>
              <span>MOVIES</span>
              <span>CRICKET</span>
              <span>FOOD</span>
              <span>LIFESTYLE</span>
              <span>HEALTH</span>
              <span>TECH</span>
              <span>GAMES</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Newspaper className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">AutoTribune</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={loading}
                className="transition-all duration-200 hover:scale-105"
              >
                <RefreshCw className={`w-4 h-4 mr-2 transition-transform duration-300 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="animate-pulse">
                <div className="aspect-[16/9] bg-muted rounded-lg mb-4 animate-pulse"></div>
                <div className="h-6 bg-muted rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-full mb-1 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="aspect-video bg-muted rounded-lg mb-2"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="w-80">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="w-16 h-12 bg-muted rounded"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded w-full mb-1"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12 opacity-0 animate-in fade-in duration-1000">
            <Newspaper className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {debouncedSearchQuery ? 'No articles match your search' : 'No Articles Yet'}
            </h2>
            <p className="text-muted-foreground">
              {debouncedSearchQuery 
                ? 'Try adjusting your search terms.' 
                : 'Articles published through your script will appear here.'
              }
            </p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Main Content Area */}
            <div className="flex-1">
              {/* Dynamic News Sections with smooth animations */}
              <div className="space-y-0">
                {sections.map((section, index) => renderSection(section, index))}
              </div>

              {/* Infinite Scroll Trigger and Loading Indicator */}
              {!debouncedSearchQuery && (
                <div className="mt-8">
                  {/* Enhanced loading indicator */}
                  {loadingMore && (
                    <div className="flex justify-center items-center py-12 opacity-0 animate-in fade-in duration-500">
                      <div className="text-center">
                        <div className="relative">
                          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse"></div>
                        </div>
                        <span className="text-muted-foreground font-medium">Loading more amazing articles...</span>
                        <div className="flex justify-center mt-2 space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Intersection observer trigger element */}
                  {hasMore && !loadingMore && (
                    <div 
                      ref={observerRef} 
                      className="flex justify-center items-center py-8 min-h-[100px] opacity-0 animate-in fade-in duration-1000"
                    >
                      <div className="text-center text-muted-foreground">
                        <div className="animate-pulse flex items-center justify-center mb-2">
                          <div className="w-3 h-3 bg-current rounded-full mx-1 animate-bounce"></div>
                          <div className="w-3 h-3 bg-current rounded-full mx-1 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-3 h-3 bg-current rounded-full mx-1 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <p className="text-sm font-medium">More stories loading...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* End of articles indicator */}
                  {!hasMore && displayedArticles.length > 0 && (
                    <div className="text-center py-12 text-muted-foreground opacity-0 animate-in fade-in duration-1000 slide-in-from-bottom-4">
                      <div className="relative">
                        <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"></div>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">You've caught up!</h3>
                      <p>You've reached the end of all articles</p>
                      <p className="text-sm mt-2 opacity-75">Total articles loaded: {displayedArticles.length}</p>
                      <Button 
                        variant="ghost" 
                        onClick={handleRefresh}
                        className="mt-4 hover:scale-105 transition-all duration-200"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Start Over
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Sidebar with smooth animations */}
            <div className="w-80 flex-shrink-0">
              <div className="opacity-0 animate-in fade-in duration-1000 slide-in-from-right-4" style={{ animationDelay: '300ms' }}>
                <Sidebar 
                  articles={sidebarArticles} 
                  onArticleClick={handleArticleClick}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Smooth scroll to top button */}
      {displayedArticles.length > 20 && (
        <div className="fixed bottom-8 right-8 z-50 opacity-0 animate-in fade-in duration-500" style={{ animationDelay: '1s' }}>
          <Button
            onClick={() => {
              window.scrollTo({ 
                top: 0, 
                behavior: 'smooth' 
              });
            }}
            size="lg"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 bg-primary/90 backdrop-blur-sm"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 10l7-7m0 0l7 7m-7-7v18" 
              />
            </svg>
          </Button>
        </div>
      )}

      {/* Progress indicator */}
      {displayedArticles.length > 0 && (
        <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 ease-out"
            style={{
              width: `${Math.min(100, (displayedArticles.length / (displayedArticles.length + (hasMore ? 20 : 0))) * 100)}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Index;
