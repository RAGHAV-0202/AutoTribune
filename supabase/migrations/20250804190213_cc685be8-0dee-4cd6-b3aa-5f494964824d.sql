-- Add slug column to articles table for SEO-friendly URLs
ALTER TABLE public.articles 
ADD COLUMN slug TEXT;

-- Create unique index on slug for performance and uniqueness
CREATE UNIQUE INDEX idx_articles_slug ON public.articles(slug);

-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Update existing articles with generated slugs
UPDATE public.articles 
SET slug = generate_slug(title) || '-' || substring(id::text, 1, 8)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating existing records
ALTER TABLE public.articles 
ALTER COLUMN slug SET NOT NULL;