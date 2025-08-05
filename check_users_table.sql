-- Check the structure of the users table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any users in the table
SELECT COUNT(*) as total_users FROM users;

-- Check a sample user record
SELECT * FROM users LIMIT 1;

-- Check if profilePicture column exists and has data
SELECT 
    id,
    name,
    CASE 
        WHEN profilePicture IS NOT NULL THEN 'Has profile picture'
        ELSE 'No profile picture'
    END as profile_status,
    CASE 
        WHEN jerseyNumber IS NOT NULL THEN jerseyNumber
        ELSE 'No jersey number'
    END as jersey_status
FROM users 
LIMIT 5; 