--
-- PostgreSQL database dump
--

\restrict 5yxx4JB9UHqvO2Fh5UpCudCVCCNggcpiSYJVY1C54Kv3fZQKhjIH6Vy9Ahkzowv

-- Dumped from database version 18.6
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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    employee_code character varying(50) NOT NULL,
    employee_name character varying(150) NOT NULL,
    department character varying(100) NOT NULL,
    basic_salary numeric(12,2) NOT NULL,
    ot_rate numeric(10,2) DEFAULT 0 NOT NULL,
    night_rate numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    date_of_joining date,
    CONSTRAINT nonnegative_night_rate CHECK ((night_rate >= (0)::numeric)),
    CONSTRAINT nonnegative_ot_rate CHECK ((ot_rate >= (0)::numeric)),
    CONSTRAINT positive_basic_salary CHECK ((basic_salary > (0)::numeric))
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: monthly_salary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_salary (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    salary_month date NOT NULL,
    attendance_days numeric(5,2) DEFAULT 0 NOT NULL,
    sunday_no_days numeric(5,2) DEFAULT 0 NOT NULL,
    ot_hours numeric(8,2) DEFAULT 0 NOT NULL,
    night_duties numeric(5,2) DEFAULT 0 NOT NULL,
    other_amount numeric(12,2) DEFAULT 0 NOT NULL,
    food_cutting numeric(12,2) DEFAULT 0 NOT NULL,
    part_payment numeric(12,2) DEFAULT 0 NOT NULL,
    deduction numeric(12,2) DEFAULT 0 NOT NULL,
    basic_pay numeric(12,2) DEFAULT 0 NOT NULL,
    sunday_amount numeric(12,2) DEFAULT 0 NOT NULL,
    ot_amount numeric(12,2) DEFAULT 0 NOT NULL,
    night_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_salary numeric(12,2) DEFAULT 0 NOT NULL,
    net_due numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    remarks text,
    department character varying(100),
    CONSTRAINT valid_attendance_days CHECK ((attendance_days >= (0)::numeric)),
    CONSTRAINT valid_night_duties CHECK ((night_duties >= (0)::numeric)),
    CONSTRAINT valid_ot_hours CHECK ((ot_hours >= (0)::numeric)),
    CONSTRAINT valid_sunday_no_days CHECK ((sunday_no_days >= (0)::numeric))
);


--
-- Name: monthly_salary_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monthly_salary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monthly_salary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monthly_salary_id_seq OWNED BY public.monthly_salary.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sessions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(100) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'EMPLOYEE'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    department character varying(100),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'HR'::character varying, 'EMPLOYEE'::character varying, 'USER'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: monthly_salary id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_salary ALTER COLUMN id SET DEFAULT nextval('public.monthly_salary_id_seq'::regclass);


--
-- Name: employees employees_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_code_key UNIQUE (employee_code);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: monthly_salary monthly_salary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_salary
    ADD CONSTRAINT monthly_salary_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: monthly_salary unique_employee_salary_month; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_salary
    ADD CONSTRAINT unique_employee_salary_month UNIQUE (employee_id, salary_month);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: monthly_salary monthly_salary_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_salary
    ADD CONSTRAINT monthly_salary_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 5yxx4JB9UHqvO2Fh5UpCudCVCCNggcpiSYJVY1C54Kv3fZQKhjIH6Vy9Ahkzowv
