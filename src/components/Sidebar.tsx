import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp } from "lucide-react";

interface SidebarArticle {
  id: string;
  title: string;
  slug: string;
  published_at: string;
  image_url?: string;
}

interface SidebarProps {
  articles: SidebarArticle[];
  onArticleClick: (slug: string) => void;
}

export function Sidebar({ articles, onArticleClick }: SidebarProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateTitle = (title: string, maxLength: number = 60) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Trending Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Trending Now</h2>
        </div>
        
        <div className="space-y-4">
          {articles.slice(0, 5).map((article, index) => (
            <div
              key={article.id}
              onClick={() => onArticleClick(article.slug)}
              className="flex gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
            >
              <div className="flex-shrink-0">
                <span className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                  {index + 1}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight hover:text-primary transition-colors">
                  {truncateTitle(article.title)}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(article.published_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Latest News Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-bold text-lg mb-4">Latest News</h2>
        
        <div className="space-y-4">
          {articles.slice(5, 10).map((article) => (
            <div
              key={article.id}
              onClick={() => onArticleClick(article.slug)}
              className="flex gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
            >
              {article.image_url && (
                <div className="flex-shrink-0">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-16 h-12 object-cover rounded"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(article.published_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-bold text-lg mb-4">Categories</h2>
        
        <div className="flex flex-wrap gap-2">
          {['Politics', 'Sports', 'Technology', 'Business', 'Entertainment', 'Health'].map((category) => (
            <Badge key={category} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              {category}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}