
-- ============================================================================
-- POPULAR TABELA disposable_email_domains COM ~100 DOMÍNIOS MAIS COMUNS
-- (inserção em lotes para não estourar limite)
-- ============================================================================

INSERT INTO public.disposable_email_domains (domain, reason) VALUES
('tempmail.com', 'Disposable email provider'),
('throwaway.email', 'Disposable email provider'),
('guerrillamail.com', 'Disposable email provider'),
('guerrillamail.info', 'Disposable email provider'),
('guerrillamail.net', 'Disposable email provider'),
('guerrillamail.org', 'Disposable email provider'),
('guerrillamail.de', 'Disposable email provider'),
('mailinator.com', 'Disposable email provider'),
('trashmail.com', 'Disposable email provider'),
('trashmail.me', 'Disposable email provider'),
('trashmail.net', 'Disposable email provider'),
('yopmail.com', 'Disposable email provider'),
('yopmail.fr', 'Disposable email provider'),
('10minutemail.com', 'Disposable email provider'),
('10minutemail.net', 'Disposable email provider'),
('tempail.com', 'Disposable email provider'),
('temp-mail.org', 'Disposable email provider'),
('temp-mail.io', 'Disposable email provider'),
('fakeinbox.com', 'Disposable email provider'),
('sharklasers.com', 'Disposable email provider'),
('grr.la', 'Disposable email provider'),
('guerrillamailblock.com', 'Disposable email provider'),
('maildrop.cc', 'Disposable email provider'),
('dispostable.com', 'Disposable email provider'),
('mailnesia.com', 'Disposable email provider'),
('mailcatch.com', 'Disposable email provider'),
('tempinbox.com', 'Disposable email provider'),
('disposable.email', 'Disposable email provider'),
('getairmail.com', 'Disposable email provider'),
('mohmal.com', 'Disposable email provider'),
('getnada.com', 'Disposable email provider'),
('emailondeck.com', 'Disposable email provider'),
('33mail.com', 'Disposable email provider'),
('maildrop.gq', 'Disposable email provider'),
('inboxkitten.com', 'Disposable email provider'),
('burnermail.io', 'Disposable email provider'),
('harakirimail.com', 'Disposable email provider'),
('mailsac.com', 'Disposable email provider'),
('anonbox.net', 'Disposable email provider'),
('mytemp.email', 'Disposable email provider'),
('tempr.email', 'Disposable email provider'),
('throwam.com', 'Disposable email provider'),
('trash-mail.com', 'Disposable email provider'),
('wegwerfmail.de', 'Disposable email provider'),
('wegwerfmail.net', 'Disposable email provider'),
('spamgourmet.com', 'Disposable email provider'),
('mintemail.com', 'Disposable email provider'),
('mailexpire.com', 'Disposable email provider'),
('safetymail.info', 'Disposable email provider'),
('filzmail.com', 'Disposable email provider'),
('mailnull.com', 'Disposable email provider'),
('spamfree24.org', 'Disposable email provider'),
('trashymail.com', 'Disposable email provider'),
('mailzilla.com', 'Disposable email provider'),
('devnullmail.com', 'Disposable email provider'),
('mailinator.net', 'Disposable email provider'),
('sneakemail.com', 'Disposable email provider'),
('tempail.net', 'Disposable email provider'),
('tempsky.com', 'Disposable email provider'),
('mailtemp.info', 'Disposable email provider'),
('crazymailing.com', 'Disposable email provider'),
('throwawayemailaddress.com', 'Disposable email provider'),
('mailforspam.com', 'Disposable email provider'),
('tempmailaddress.com', 'Disposable email provider'),
('emailfake.com', 'Disposable email provider'),
('generator.email', 'Disposable email provider'),
('tmail.ws', 'Disposable email provider'),
('mailpoof.com', 'Disposable email provider'),
('tempmailo.com', 'Disposable email provider'),
('emailtemporario.com.br', 'Disposable email provider'),
('1secmail.com', 'Disposable email provider'),
('1secmail.net', 'Disposable email provider'),
('1secmail.org', 'Disposable email provider'),
('luxusmail.org', 'Disposable email provider'),
('clipmail.eu', 'Disposable email provider'),
('spambox.us', 'Disposable email provider'),
('trashmail.io', 'Disposable email provider'),
('trashmail.org', 'Disposable email provider'),
('nada.email', 'Disposable email provider'),
('nada.ltd', 'Disposable email provider'),
('mailbox.in.ua', 'Disposable email provider'),
('dropmail.me', 'Disposable email provider'),
('fakemail.net', 'Disposable email provider'),
('incognitomail.org', 'Disposable email provider'),
('spamcowboy.com', 'Disposable email provider'),
('jetable.org', 'Disposable email provider'),
('meltmail.com', 'Disposable email provider'),
('mailimate.com', 'Disposable email provider'),
('tempmailgen.com', 'Disposable email provider'),
('tmpmail.net', 'Disposable email provider'),
('tmpmail.org', 'Disposable email provider'),
('guerrillamail.biz', 'Disposable email provider'),
('maileater.com', 'Disposable email provider'),
('mailmoat.com', 'Disposable email provider'),
('mailquack.com', 'Disposable email provider'),
('hidemail.de', 'Disposable email provider'),
('emailwarden.com', 'Disposable email provider'),
('tempemails.io', 'Disposable email provider'),
('tempmails.net', 'Disposable email provider'),
('internxt.email', 'Disposable email provider'),
('duck.com', 'Relay/privacy email')
ON CONFLICT (domain) DO NOTHING;

-- ============================================================================
-- CRIAR FUNÇÃO PARA VALIDAR EMAIL NO SIGNUP (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_disposable_email(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.disposable_email_domains
    WHERE is_active = true
      AND lower(check_email) LIKE '%@' || domain
  );
$$;

-- ============================================================================
-- CRIAR TRIGGER PARA BLOQUEAR SIGNUP COM EMAIL DESCARTÁVEL
-- Funciona como validação server-side na tabela auth.users via trigger
-- Nota: Não podemos criar triggers em auth.users (schema reservado)
-- Então validamos via a função RPC + frontend + edge function
-- ============================================================================

-- Conceder acesso anônimo à função de verificação (necessário para validar antes do signup)
GRANT EXECUTE ON FUNCTION public.is_disposable_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_disposable_email(text) TO authenticated;
