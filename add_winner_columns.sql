-- Add winner columns to matches table
ALTER TABLE public.matches 
ADD COLUMN winner_id uuid NULL,
ADD COLUMN winner_name text NULL;

-- Add foreign key constraint for winner_id
ALTER TABLE public.matches 
ADD CONSTRAINT matches_winner_id_fkey 
FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Add winner columns to tournament_matches table (if it exists)
-- Note: This assumes tournament_matches table has similar structure
-- You may need to adjust this based on your actual tournament_matches schema
-- ALTER TABLE public.tournament_matches 
-- ADD COLUMN winner_id uuid NULL,
-- ADD COLUMN winner_name text NULL;

-- ALTER TABLE public.tournament_matches 
-- ADD CONSTRAINT tournament_matches_winner_id_fkey 
-- FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL; 