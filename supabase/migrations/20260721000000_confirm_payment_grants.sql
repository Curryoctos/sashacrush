-- confirm-payment edge function confirms payments and inserts receipts as service_role.

GRANT UPDATE ON public.payments TO service_role;
GRANT INSERT ON public.receipts TO service_role;
