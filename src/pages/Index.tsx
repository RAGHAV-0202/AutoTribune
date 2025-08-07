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

const ARTICLES_PER_PAGE = 20;

const Index = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const fetchArticles = async (pageNum: number = 0, append: boolean = false) => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      
      if (!append) setLoading(true);
      else setLoadingMore(true);

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
          return updated;
        });
      } else {
        setArticles(newArticles);
        setPage(0);
      }

      // Fix: Use the current articles length for hasMore calculation
      setArticles(currentArticles => {
        const totalLoaded = append ? 
          currentArticles.length : 
          newArticles.length;
        
        const hasMoreArticles = count ? totalLoaded < count : newArticles.length === ARTICLES_PER_PAGE;
        setHasMore(hasMoreArticles);
        
        console.log(`Has more articles: ${hasMoreArticles}, Total loaded: ${totalLoaded}, Total count: ${count}`);
        return currentArticles;
      });

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

  const loadMoreArticles = useCallback(() => {
    if (
      isLoadingRef.current || 
      loadingMore || 
      !hasMore || 
      searchQuery || 
      loading
    ) {
      console.log('Skipping loadMore:', { 
        isLoading: isLoadingRef.current, 
        loadingMore, 
        hasMore, 
        searchQuery: !!searchQuery,
        loading 
      });
      return;
    }

    const nextPage = page + 1;
    console.log(`Loading more articles - Next page: ${nextPage}, Current articles: ${articles.length}`);
    setPage(nextPage);
    fetchArticles(nextPage, true);
  }, [loadingMore, hasMore, page, searchQuery, loading, articles.length]); // Added articles.length dependency

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !searchQuery) { // Added searchQuery check
          console.log('Intersection triggered - loading more articles');
          loadMoreArticles();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // Reduced margin to prevent premature loading
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
  }, [loadMoreArticles]);

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleArticleClick = (slug: string) => {
    navigate(`/article/${slug}`);
  };

  const handleRefresh = () => {
    setArticles([]);
    setPage(0);
    setHasMore(true);
    isLoadingRef.current = false;
    fetchArticles();
  };

  const filteredArticles = searchQuery 
    ? articles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : articles;

  // Create dynamic sections with random layouts for all articles
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
      const batchSize = Math.min(8, remainingArticles.length); // Process in batches of 8
      const batch = remainingArticles.slice(0, batchSize);
      
      if (batch.length === 0) break;

      // Random layout patterns
      const layoutPatterns = [
        // Pattern 1: Large + Medium mix
        {
          type: 'mixed',
          featured: batch[0],
          large: batch.slice(1, 3),
          medium: batch.slice(3, 7),
          small: batch.slice(7, 8)
        },
        // Pattern 2: Grid of medium articles
        {
          type: 'grid',
          medium: batch.slice(0, 8)
        },
        // Pattern 3: Two large + small articles
        {
          type: 'highlight',
          large: batch.slice(0, 2),
          small: batch.slice(2, 8)
        },
        // Pattern 4: One featured + rest medium
        {
          type: 'featured_mix',
          featured: batch[0],
          medium: batch.slice(1, 8)
        },
        // Pattern 5: All small articles in 2 rows
        {
          type: 'compact',
          small: batch.slice(0, 8)
        }
      ];

      // Select random pattern
      const randomPattern = layoutPatterns[Math.floor(Math.random() * layoutPatterns.length)];
      sections.push({
        ...randomPattern,
        sectionIndex: sections.length
      });

      currentIndex += batchSize;
    }

    return {
      sections,
      sidebarArticles: articles.slice(11, 31) // Sidebar gets articles 11-30
    };
  };

  const { sections, sidebarArticles } = createDynamicSections(filteredArticles);

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
                  className="pl-10 w-64"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
                <div className="aspect-[16/9] bg-muted rounded-lg mb-4"></div>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-full mb-1"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
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
                  <div key={i} className="animate-pulse flex gap-3">
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
          <div className="text-center py-12">
            <Newspaper className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? 'No articles match your search' : 'No Articles Yet'}
            </h2>
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'Try adjusting your search terms.' 
                : 'Articles published through your script will appear here.'
              }
            </p>
          </div>
        ) : (
          <div className="flex gap-6">
  // Render a single section with dynamic layout
  const renderSection = (section: any, index: number) => {
    const sectionKey = `section-${index}`;
    
    if (section.type === 'initial') {
      return (
        <div key={sectionKey} className="grid grid-cols-4 gap-4 auto-rows-max mb-8">
          {/* Featured Article - Takes 2x2 space */}
          {section.featured && (
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
          )}
          
          {/* Medium Articles - Fill remaining space in first row */}
          {section.medium.slice(0, 2).map((article: Article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant="medium"
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
          
          {/* Large Articles - Take 2 columns each */}
          {section.large.map((article: Article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant="large"
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
          
          {/* More Medium Articles */}
          {section.medium.slice(2).map((article: Article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant="medium"
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
          
          {/* Small Articles - Full width row */}
          {section.small.length > 0 && (
            <div className="col-span-4 grid grid-cols-2 gap-4">
              {section.small.map((article: Article) => (
                <ArticleCard
                  key={article.id}
                  id={article.id}
                  title={article.title}
                  content={article.content}
                  image_url={article.image_url}
                  published_at={article.published_at}
                  slug={article.slug}
                  variant="small"
                  onClick={() => handleArticleClick(article.slug)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (section.type === 'mixed') {
      return (
        <div key={sectionKey} className="grid grid-cols-4 gap-4 auto-rows-max mb-8">
          {/* Featured article */}
          {section.featured && (
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
          )}
          
          {/* Medium articles fill remaining space */}
          {section.medium.slice(0, 2).map((article: Article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant="medium"
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
          
          {/* Large articles */}
          {section.large.map((article: Article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant="large"
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
          
          {/* Rest of medium articles */}
          {section.medium.slice(2).map((article: Article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant="medium"
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
          
          {/* Small articles */}
          {section.small && section.small.length > 0 && (
            <div className="col-span-4 grid grid-cols-4 gap-4">
              {section.small.map((article: Article) => (
                <ArticleCard
                  key={article.id}
                  id={article.id}
                  title={article.title}
                  content={article.content}
                  image_url={article.image_url}
                  published_at={article.published_at}
                  slug={article.slug}
                  variant="small"
                  onClick={() => handleArticleClick(article.slug)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (section.type === 'grid') {
      return (
        <div key={sectionKey} className="grid grid-cols-4 gap-4 mb-8">
          {section.medium.map((article: Article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant="medium"
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
        </div>
      );
    }

    if (section.type === 'highlight') {
      return (
        <div key={sectionKey} className="grid grid-cols-4 gap-4 auto-rows-max mb-8">
          {/* Two large articles side by side */}
          {section.large.map((article: Article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant="large"
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
          
          {/* Small articles fill remaining space */}
          {section.small.length > 0 && (
            <div className="col-span-4 grid grid-cols-3 gap-4">
              {section.small.map((article: Article) => (
                <ArticleCard
                  key={article.id}
                  id={article.id}
                  title={article.title}
                  content={article.content}
                  image_url={article.image_url}
                  published_at={article.published_at}
                  slug={article.slug}
                  variant="small"
                  onClick={() => handleArticleClick(article.slug)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (section.type === 'featured_mix') {
      return (
        <div key={sectionKey} className="grid grid-cols-4 gap-4 auto-rows-max mb-8">
          {/* Featured article takes 2x2 */}
          {section.featured && (
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
          )}
          
          {/* Medium articles fill around */}
          {section.medium.map((article: Article, idx: number) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant={idx < 2 ? "medium" : "small"}
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
        </div>
      );
    }

    if (section.type === 'compact') {
      return (
        <div key={sectionKey} className="grid grid-cols-4 gap-4 mb-8">
          {section.small.map((article: Article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              content={article.content}
              image_url={article.image_url}
              published_at={article.published_at}
              slug={article.slug}
              variant="small"
              onClick={() => handleArticleClick(article.slug)}
            />
          ))}
        </div>
      );
    }

    return null;
  };

              {/* Debug Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
                  <p>Total Articles: {articles.length}</p>
                  <p>Filtered Articles: {filteredArticles.length}</p>
                  <p>Sections: {sections.length}</p>
                  <p>Current Page: {page}</p>
                  <p>Has More: {hasMore.toString()}</p>
                  <p>Loading More: {loadingMore.toString()}</p>
                  <p>Search Query: {searchQuery || 'None'}</p>
                </div>
              )}

              {/* Infinite Scroll Trigger and Loading Indicator */}
              {!searchQuery && (
                <div className="mt-8">
                  {/* Loading indicator */}
                  {loadingMore && (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                      <span className="text-muted-foreground">Loading more articles...</span>
                    </div>
                  )}
                  
                  {/* Intersection observer trigger element */}
                  {hasMore && !loadingMore && (
                    <div 
                      ref={observerRef} 
                      className="flex justify-center items-center py-8 min-h-[100px]"
                    >
                      <div className="text-center text-muted-foreground">
                        <div className="animate-pulse flex items-center justify-center">
                          <div className="w-2 h-2 bg-current rounded-full mx-1 animate-bounce"></div>
                          <div className="w-2 h-2 bg-current rounded-full mx-1 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-current rounded-full mx-1 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <p className="mt-2 text-sm">Scroll to load more...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* End of articles indicator */}
                  {!hasMore && articles.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>You've reached the end of articles</p>
                      <p className="text-sm mt-1">Total articles loaded: {articles.length}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Sidebar */}
            <div className="w-80 flex-shrink-0">
              <Sidebar 
                articles={sidebarArticles} 
                onArticleClick={handleArticleClick}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
