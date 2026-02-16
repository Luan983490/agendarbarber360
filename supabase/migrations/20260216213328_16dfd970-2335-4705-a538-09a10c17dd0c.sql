-- Un-confirm email for existing user so grace period logic can work
-- This is a one-time fix for users created before email confirmation was enabled
UPDATE auth.users 
SET email_confirmed_at = NULL 
WHERE email = 'xepipi1353@iaciu.com';