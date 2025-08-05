import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface ArticleCardProps {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  published_at: string;
  slug: string;
  onClick?: () => void;
  variant?: 'default' | 'featured' | 'compact' | 'large' | 'medium' | 'small';
}

export function ArticleCard({ 
  title, 
  content, 
  image_url, 
  published_at, 
  slug,
  onClick,
  variant = 'default'
}: ArticleCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (text: string, maxLength: number = variant === 'featured' ? 200 : 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (variant === 'featured') {
    return (
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group col-span-2 row-span-2" onClick={onClick}>
        <div className="relative h-full flex flex-col">
          {image_url && (
            <div className="aspect-[16/10] overflow-hidden">
              <img 
                src={image_url} 
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          
          <CardContent className="p-6 flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Clock className="w-4 h-4" />
              <span>{formatDate(published_at)}</span>
            </div>
            
            <h2 className="text-2xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
              {title}
            </h2>
            
            <p className="text-muted-foreground leading-relaxed line-clamp-4">
              {truncateContent(content, 250)}
            </p>
          </CardContent>
        </div>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <div 
        className="flex gap-3 p-3 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors" 
        onClick={onClick}
      >
        {image_url && (
          <div className="flex-shrink-0">
            <img 
              src={image_url} 
              alt={title}
              className="w-20 h-16 object-cover rounded"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight hover:text-primary transition-colors line-clamp-2 mb-1">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatDate(published_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'large') {
    return (
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group col-span-2" onClick={onClick}>
        <div className="flex h-full">
          {image_url && (
            <div className="w-1/2 overflow-hidden">
              <img 
                src={image_url} 
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          
          <CardContent className="p-4 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Clock className="w-3 h-3" />
              <span>{formatDate(published_at)}</span>
            </div>
            
            <h3 className="font-bold mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-3">
              {title}
            </h3>
            
            <p className="text-sm text-muted-foreground line-clamp-3">
              {truncateContent(content, 150)}
            </p>
          </CardContent>
        </div>
      </Card>
    );
  }

  if (variant === 'medium') {
    return (
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group" onClick={onClick}>
        {image_url && (
          <div className="aspect-[4/3] overflow-hidden">
            <img 
              src={image_url} 
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="w-3 h-3" />
            <span>{formatDate(published_at)}</span>
          </div>
          
          <h3 className="font-semibold mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {truncateContent(content, 100)}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'small') {
    return (
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group" onClick={onClick}>
        <div className="flex gap-3 p-4">
          {image_url && (
            <div className="w-20 h-16 flex-shrink-0 overflow-hidden rounded">
              <img 
                src={image_url} 
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(published_at)}</span>
            </div>
            
            <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h3>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200" 
      onClick={onClick}
    >
      {image_url && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          <img 
            src={image_url} 
            alt={title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Clock className="w-4 h-4" />
          <span>{formatDate(published_at)}</span>
        </div>
        <CardTitle className="line-clamp-2 hover:text-primary transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground line-clamp-3">
          {truncateContent(content)}
        </p>
        <Badge variant="secondary" className="mt-3">
          Read More
        </Badge>
      </CardContent>
    </Card>
  );
}