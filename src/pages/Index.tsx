import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { RefreshCw, Newspaper, Search } from "lucide-react";
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

const Index = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching articles:', error);
        toast({
          title: "Error",
          description: "Failed to load articles",
          variant: "destructive",
        });
        return;
      }

      setArticles(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleArticleClick = (slug: string) => {
    navigate(`/article/${slug}`);
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredArticle = filteredArticles[0];
  const largeArticles = filteredArticles.slice(1, 3);
  const mediumArticles = filteredArticles.slice(3, 7);
  const smallArticles = filteredArticles.slice(7, 11);
  const sidebarArticles = filteredArticles.slice(11);

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
                onClick={fetchArticles}
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
                {featuredArticle && (
                  <ArticleCard
                    key={featuredArticle.id}
                    id={featuredArticle.id}
                    title={featuredArticle.title}
                    content={featuredArticle.content}
                    image_url={featuredArticle.image_url}
                    published_at={featuredArticle.published_at}
                    slug={featuredArticle.slug}
                    variant="featured"
                    onClick={() => handleArticleClick(featuredArticle.slug)}
                  />
                )}
                
                {/* Medium Articles - Fill remaining space in first row */}
                {mediumArticles.slice(0, 2).map((article) => (
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
                {largeArticles.map((article) => (
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
                {mediumArticles.slice(2).map((article) => (
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
                {smallArticles.length > 0 && (
                  <div className="col-span-4 grid grid-cols-2 gap-4">
                    {smallArticles.map((article) => (
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
