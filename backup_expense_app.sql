--
-- PostgreSQL database dump
--

\restrict vlJtHsh1Ts9JtK5484iVgfUJvQa6jBFiANbI5az7aZ0NpZWgW5zhzg3w3aaDkeB

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg12+2)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: expense_application_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO expense_application_user;

--
-- Name: operationtype; Type: TYPE; Schema: public; Owner: expense_application_user
--

CREATE TYPE public.operationtype AS ENUM (
    'expense',
    'income',
    'transfer'
);


ALTER TYPE public.operationtype OWNER TO expense_application_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: expense_application_user
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    currency character varying(3) NOT NULL,
    balance numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    bank character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_accounts_balance_non_negative CHECK ((balance >= (0)::numeric)),
    CONSTRAINT ck_accounts_currency_len3 CHECK ((length((currency)::text) = 3))
);


ALTER TABLE public.accounts OWNER TO expense_application_user;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: expense_application_user
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO expense_application_user;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: expense_application_user
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: expense_application_user
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    type public.operationtype NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO expense_application_user;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: expense_application_user
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO expense_application_user;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: expense_application_user
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: operations; Type: TABLE; Schema: public; Owner: expense_application_user
--

CREATE TABLE public.operations (
    id integer NOT NULL,
    concept character varying(250) NOT NULL,
    amount numeric(12,2) NOT NULL,
    type public.operationtype NOT NULL,
    currency character varying(3) NOT NULL,
    date timestamp without time zone NOT NULL,
    account_id integer NOT NULL,
    category_id integer NOT NULL,
    name character varying(250),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_operations_amount_positive CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.operations OWNER TO expense_application_user;

--
-- Name: operations_id_seq; Type: SEQUENCE; Schema: public; Owner: expense_application_user
--

CREATE SEQUENCE public.operations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.operations_id_seq OWNER TO expense_application_user;

--
-- Name: operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: expense_application_user
--

ALTER SEQUENCE public.operations_id_seq OWNED BY public.operations.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: expense_application_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO expense_application_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: expense_application_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO expense_application_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: expense_application_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: operations id; Type: DEFAULT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.operations ALTER COLUMN id SET DEFAULT nextval('public.operations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: expense_application_user
--

COPY public.accounts (id, user_id, name, currency, balance, bank, is_active, created_at, updated_at) FROM stdin;
2	1	Cuenta billetera	ARS	5.00	Mercado Pago	t	2026-10-18 00:52:48.217123	2026-10-23 00:10:59.009775
1	1	Caja de ahorro	ARS	10477284.74	Banco Galicia	t	2026-10-18 00:34:36.194289	2026-10-27 15:09:39.830794
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: expense_application_user
--

COPY public.categories (id, name, type, description, is_active, created_at, updated_at) FROM stdin;
1	Supermercado	expense	Compras de alimentos, limpieza y artículos de primera necesidad	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
2	Servicios	expense	Pagos de servicios básicos del hogar (luz, gas, agua, internet, telefonía)	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
3	Suscripciones	expense	Servicios de streaming, plataformas digitales y membresías periódicas	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
4	Expensas	expense	Gastos comunes y de mantenimiento del edificio o consorcio	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
5	Alquiler	expense	Pago mensual del alquiler de la vivienda o inmueble	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
6	Viajes	expense	Gastos de transporte, pasajes, hospedaje y turismo	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
7	Otros Gastos	expense	Gastos varios o eventuales que no encajan en otra categoría	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
8	Sueldo	income	Cobro de salarios, honorarios o ingresos laborales principales	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
9	Otros Ingresos	income	Ingresos extraordinarios, cobros varios o rendimientos	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
10	Transferencias	transfer	Envíos de dinero a personas o cuentas externas	t	2026-10-17 23:34:06.406402	2026-10-17 23:34:06.406402
\.


--
-- Data for Name: operations; Type: TABLE DATA; Schema: public; Owner: expense_application_user
--

COPY public.operations (id, concept, amount, type, currency, date, account_id, category_id, name, created_at, updated_at) FROM stdin;
1	Almuerzo en La farola	61000.00	expense	ARS	2026-10-18 18:36:15.745515	1	7	La farola	2026-10-18 18:36:15.734019	2026-10-18 18:36:15.734019
3	Pago de sesión de kinesiología particular	40000.00	expense	ARS	2026-10-19 14:28:44.093143	1	2	Sesión de Kinesiología Particular	2026-10-19 14:28:44.084622	2026-10-19 14:28:44.084622
4	Compra en Carrefour	16480.65	expense	ARS	2026-10-19 16:01:35.709134	1	1	Carrefour	2026-10-19 16:01:35.699401	2026-10-19 16:01:35.699401
5	Pago de monotributo en ARCA	49527.18	expense	ARS	2026-10-21 01:18:32.836151	1	7	ARCA	2026-10-21 01:18:32.826402	2026-10-21 01:18:32.826402
6	Interés capitalizado	193.51	income	ARS	2026-10-21 01:19:41.184221	1	9	\N	2026-10-21 01:19:41.176418	2026-10-21 01:19:41.176418
7	Pago de kinesiología particular	40000.00	expense	ARS	2026-10-21 14:36:16.246812	1	7	Kinesiología Particular	2026-10-21 14:36:16.236239	2026-10-21 14:36:16.236239
8	Pago recibido	5000.00	income	ARS	2026-10-23 00:10:06.82379	2	9	\N	2026-10-23 00:10:06.791078	2026-10-23 00:10:06.791078
9	Compra en el kiosco 24 hs	5095.00	expense	ARS	2026-10-23 00:10:59.014076	2	7	kiosco 24 hs	2026-10-23 00:10:59.009775	2026-10-23 00:10:59.009775
10	Compra en el supermercado Dia	15954.57	expense	ARS	2026-10-23 20:41:19.959184	1	1	Dia	2026-10-23 20:41:19.945592	2026-10-23 20:41:19.945592
11	Compra en Carrefour	9641.70	expense	ARS	2026-10-25 21:18:32.778869	1	1	Carrefour	2026-10-25 21:18:32.771446	2026-10-25 21:18:32.771446
12	Pago de sesión de kinesiología	40000.00	expense	ARS	2026-10-26 14:32:06.95153	1	7	kinesiologia	2026-10-26 14:32:06.943229	2026-10-26 14:32:06.943229
13	Suscripción a Spotify	6793.49	expense	ARS	2026-10-26 15:01:59.163153	1	3	Spotify	2026-10-26 15:01:59.144073	2026-10-26 15:01:59.144073
14	Compra en Carrefour	13208.10	expense	ARS	2026-10-26 15:02:28.040686	1	1	Carrefour	2026-10-26 15:02:28.032235	2026-10-26 15:02:28.032235
15	Compra en Día	23403.20	expense	ARS	2026-10-27 15:09:39.841617	1	1	Día	2026-10-27 15:09:39.830794	2026-10-27 15:09:39.830794
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: expense_application_user
--

COPY public.users (id, name, email, password, is_active, created_at, updated_at) FROM stdin;
1	Matias Mazparrote	matumazparrote@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$PiH3XNo3a14HgEcxu/afAA$h+aPqR8UqUeth81jjljmZryafZbSuNn66TjcJJ3knM0	t	2026-10-18 00:32:07.923153	2026-10-18 00:32:07.923153
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: expense_application_user
--

SELECT pg_catalog.setval('public.accounts_id_seq', 2, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: expense_application_user
--

SELECT pg_catalog.setval('public.categories_id_seq', 10, true);


--
-- Name: operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: expense_application_user
--

SELECT pg_catalog.setval('public.operations_id_seq', 15, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: expense_application_user
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: operations operations_pkey; Type: CONSTRAINT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_pkey PRIMARY KEY (id);


--
-- Name: accounts uq_accounts_user_name; Type: CONSTRAINT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT uq_accounts_user_name UNIQUE (user_id, name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_accounts_id; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_accounts_id ON public.accounts USING btree (id);


--
-- Name: ix_accounts_user_id; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_accounts_user_id ON public.accounts USING btree (user_id);


--
-- Name: ix_categories_id; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_categories_id ON public.categories USING btree (id);


--
-- Name: ix_categories_name; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_categories_name ON public.categories USING btree (name);


--
-- Name: ix_operations_account_id; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_operations_account_id ON public.operations USING btree (account_id);


--
-- Name: ix_operations_category_id; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_operations_category_id ON public.operations USING btree (category_id);


--
-- Name: ix_operations_concept; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_operations_concept ON public.operations USING btree (concept);


--
-- Name: ix_operations_date; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_operations_date ON public.operations USING btree (date);


--
-- Name: ix_operations_id; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_operations_id ON public.operations USING btree (id);


--
-- Name: ix_operations_type; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_operations_type ON public.operations USING btree (type);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_name; Type: INDEX; Schema: public; Owner: expense_application_user
--

CREATE UNIQUE INDEX ix_users_name ON public.users USING btree (name);


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: operations operations_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: operations operations_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: expense_application_user
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO expense_application_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO expense_application_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO expense_application_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO expense_application_user;


--
-- PostgreSQL database dump complete
--

\unrestrict vlJtHsh1Ts9JtK5484iVgfUJvQa6jBFiANbI5az7aZ0NpZWgW5zhzg3w3aaDkeB

