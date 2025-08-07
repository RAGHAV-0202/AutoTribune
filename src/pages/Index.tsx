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

  // Fix: Create sections that adapt to available articles
  const createArticleSections = (articles: Article[]) => {
    const sections = {
      featured: articles[0] || null,
      large: articles.slice(1, 3),
      medium: articles.slice(3, 7),
      small: articles.slice(7, 11),
      additional: articles.slice(11), // All remaining articles for infinite scroll
      sidebar: articles.slice(11, 21) // Limited sidebar articles
    };
    return sections;
  };

  const sections = createArticleSections(filteredArticles);

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
            {/* Main Content Area */}
            <div className="flex-1">
              {/* Dynamic News Grid */}
              <div className="grid grid-cols-4 gap-4 auto-rows-max">
                {/* Featured Article - Takes 2x2 space */}
                {sections.featured && (
                  <ArticleCard
                    key={sections.featured.id}
                    id={sections.featured.id}
                    title={sections.featured.title}
                    content={sections.featured.content}
                    image_url={sections.featured.image_url}
                    published_at={sections.featured.published_at}
                    slug={sections.featured.slug}
                    variant="featured"
                    onClick={() => handleArticleClick(sections.featured.slug)}
                  />
                )}
                
                {/* Medium Articles - Fill remaining space in first row */}
                {sections.medium.slice(0, 2).map((article) => (
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
                {sections.large.map((article) => (
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
                {sections.medium.slice(2).map((article) => (
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
                {sections.small.length > 0 && (
                  <div className="col-span-4 grid grid-cols-2 gap-4">
                    {sections.small.map((article) => (
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

                {/* Additional Articles for Infinite Scroll - Simple grid layout */}
                {sections.additional.length > 0 && (
                  <div className="col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sections.additional.map((article) => (
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
                )}
              </div>

              {/* Debug Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
                  <p>Total Articles: {articles.length}</p>
                  <p>Filtered Articles: {filteredArticles.length}</p>
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
                articles={sections.sidebar} 
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
