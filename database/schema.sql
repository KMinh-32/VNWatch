--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: CatalogStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CatalogStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'DISCONTINUED'
);


--
-- Name: MovementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MovementType" AS ENUM (
    'QUARTZ',
    'AUTOMATIC',
    'MECHANICAL',
    'SOLAR'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'UNPAID',
    'PAID'
);


--
-- Name: ShippingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ShippingStatus" AS ENUM (
    'NOT_SHIPPED',
    'IN_TRANSIT',
    'DELIVERED'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'CUSTOMER',
    'STAFF',
    'ADMIN'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'BLOCKED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: HoiThoai; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HoiThoai" (
    "maHoiThoai" uuid NOT NULL,
    "maTK" uuid,
    "guestTokenHash" character(64),
    "tieuDe" character varying(150),
    "trangThai" character varying(20) DEFAULT 'DANG_MO'::character varying NOT NULL,
    "dataKind" character varying(20) DEFAULT 'REFERENCE'::character varying NOT NULL,
    "ngayTao" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ngayCapNhat" timestamp(3) with time zone NOT NULL,
    CONSTRAINT "HoiThoai_kind_check" CHECK ((("dataKind")::text = ANY ((ARRAY['REFERENCE'::character varying, 'DEMO'::character varying])::text[]))),
    CONSTRAINT "HoiThoai_owner_check" CHECK ((("maTK" IS NOT NULL) <> ("guestTokenHash" IS NOT NULL))),
    CONSTRAINT "HoiThoai_status_check" CHECK ((("trangThai")::text = ANY ((ARRAY['DANG_MO'::character varying, 'DA_DONG'::character varying])::text[])))
);


--
-- Name: TinNhan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TinNhan" (
    "maTinNhan" integer NOT NULL,
    "maHoiThoai" uuid NOT NULL,
    "nguoiGui" character varying(15) NOT NULL,
    "noiDung" text NOT NULL,
    "yDinh" character varying(30),
    "cheDo" character varying(20),
    "tenMoHinh" character varying(100),
    "trangThai" character varying(20) DEFAULT 'HOAN_THANH'::character varying NOT NULL,
    "thoiGian" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requestId" uuid NOT NULL,
    "duLieuTraLoi" jsonb,
    CONSTRAINT "TinNhan_mode_check" CHECK ((("cheDo" IS NULL) OR (("cheDo")::text = ANY ((ARRAY['CATALOG'::character varying, 'OPENAI'::character varying])::text[])))),
    CONSTRAINT "TinNhan_sender_check" CHECK ((("nguoiGui")::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[]))),
    CONSTRAINT "TinNhan_status_check" CHECK ((("trangThai")::text = ANY ((ARRAY['DANG_XU_LY'::character varying, 'HOAN_THANH'::character varying, 'LOI'::character varying])::text[])))
);


--
-- Name: TinNhan_maTinNhan_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TinNhan_maTinNhan_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TinNhan_maTinNhan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TinNhan_maTinNhan_seq" OWNED BY public."TinNhan"."maTinNhan";


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_events (
    id uuid NOT NULL,
    actor_id uuid,
    target_user_id uuid NOT NULL,
    action character varying(64) NOT NULL,
    before jsonb NOT NULL,
    after jsonb NOT NULL,
    reason character varying(200),
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: auth_rate_buckets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_rate_buckets (
    key_hash character(64) NOT NULL,
    hits integer DEFAULT 1 NOT NULL,
    expires_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT auth_rate_buckets_hits_check CHECK ((hits > 0))
);


--
-- Name: business_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_audits (
    id uuid NOT NULL,
    actor_id uuid,
    action character varying(64) NOT NULL,
    target_id character varying(100) NOT NULL,
    before jsonb NOT NULL,
    after jsonb NOT NULL,
    reason character varying(500) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cart_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_lines (
    user_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    quantity integer NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT cart_quantity_range CHECK (((quantity >= 1) AND (quantity <= 99)))
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: order_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_events (
    id uuid NOT NULL,
    order_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    action character varying(32) NOT NULL,
    reason character varying(500) NOT NULL,
    before jsonb NOT NULL,
    after jsonb NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid NOT NULL,
    order_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    product_name character varying(200) NOT NULL,
    variant_label character varying(120) NOT NULL,
    sku character varying(64) NOT NULL,
    quantity integer NOT NULL,
    unit_price_vnd integer NOT NULL,
    line_total_vnd integer NOT NULL,
    warranty_months integer,
    CONSTRAINT order_line_valid CHECK (((quantity >= 1) AND (quantity <= 99) AND (unit_price_vnd >= 0) AND (warranty_months >= 0) AND ((line_total_vnd)::bigint = ((quantity)::bigint * (unit_price_vnd)::bigint))))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    idempotency_key uuid NOT NULL,
    request_hash character(64) NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    payment_status public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    shipping_status public."ShippingStatus" DEFAULT 'NOT_SHIPPED'::public."ShippingStatus" NOT NULL,
    recipient_name character varying(80) NOT NULL,
    phone character varying(16) NOT NULL,
    address character varying(500) NOT NULL,
    subtotal_vnd integer NOT NULL,
    shipping_fee_vnd integer NOT NULL,
    total_vnd integer NOT NULL,
    payment_method character varying(8) DEFAULT 'COD'::character varying NOT NULL,
    warranty_policy character varying(500) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    discount_vnd integer DEFAULT 0 NOT NULL,
    promotion_code character varying(32),
    archived_at timestamp(3) with time zone,
    CONSTRAINT order_discount_range CHECK (((discount_vnd >= 0) AND (discount_vnd <= subtotal_vnd))),
    CONSTRAINT order_money_valid CHECK (((subtotal_vnd >= 0) AND (shipping_fee_vnd >= 0) AND ((total_vnd)::bigint = (((subtotal_vnd)::bigint - (discount_vnd)::bigint) + (shipping_fee_vnd)::bigint)))),
    CONSTRAINT order_payment_method_valid CHECK (((payment_method)::text = ANY (ARRAY[('COD'::character varying)::text, ('QR_DEMO'::character varying)::text]))),
    CONSTRAINT order_state_valid CHECK ((((status = 'PENDING'::public."OrderStatus") AND (shipping_status = 'NOT_SHIPPED'::public."ShippingStatus") AND ((payment_status = 'UNPAID'::public."PaymentStatus") OR ((payment_method)::text = 'QR_DEMO'::text))) OR ((status = 'CONFIRMED'::public."OrderStatus") AND ((((payment_method)::text = 'COD'::text) AND (payment_status = 'UNPAID'::public."PaymentStatus") AND (shipping_status = ANY (ARRAY['NOT_SHIPPED'::public."ShippingStatus", 'IN_TRANSIT'::public."ShippingStatus"]))) OR (((payment_method)::text = 'QR_DEMO'::text) AND (((payment_status = 'UNPAID'::public."PaymentStatus") AND (shipping_status = 'NOT_SHIPPED'::public."ShippingStatus")) OR ((payment_status = 'PAID'::public."PaymentStatus") AND (shipping_status = ANY (ARRAY['NOT_SHIPPED'::public."ShippingStatus", 'IN_TRANSIT'::public."ShippingStatus"]))))))) OR ((status = 'COMPLETED'::public."OrderStatus") AND (payment_status = 'PAID'::public."PaymentStatus") AND (shipping_status = 'DELIVERED'::public."ShippingStatus")) OR ((status = 'CANCELLED'::public."OrderStatus") AND (payment_status = 'UNPAID'::public."PaymentStatus") AND (shipping_status = 'NOT_SHIPPED'::public."ShippingStatus")))),
    CONSTRAINT orders_archive_terminal CHECK (((archived_at IS NULL) OR (status = ANY (ARRAY['COMPLETED'::public."OrderStatus", 'CANCELLED'::public."OrderStatus"]))))
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone NOT NULL,
    consumed_at timestamp(3) with time zone,
    CONSTRAINT password_reset_tokens_valid_expiry CHECK ((expires_at > created_at))
);


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_reviews (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    rating integer NOT NULL,
    body character varying(1000) NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT review_rating_range CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid NOT NULL,
    product_id uuid NOT NULL,
    sku character varying(64) NOT NULL,
    label character varying(120) NOT NULL,
    price_vnd integer NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    status public."CatalogStatus" DEFAULT 'DRAFT'::public."CatalogStatus" NOT NULL,
    movement_type public."MovementType" NOT NULL,
    case_diameter_mm numeric(5,2),
    case_material character varying(100) NOT NULL,
    crystal_material character varying(100) NOT NULL,
    strap_material character varying(100) NOT NULL,
    water_resistance_m integer NOT NULL,
    warranty_months integer,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    case_dimensions_mm character varying(100),
    price_source_name character varying(120),
    price_source_url text,
    price_checked_at timestamp(3) with time zone,
    CONSTRAINT product_variants_diameter_positive CHECK ((case_diameter_mm > (0)::numeric)),
    CONSTRAINT product_variants_price_nonnegative CHECK ((price_vnd >= 0)),
    CONSTRAINT product_variants_stock_nonnegative CHECK ((stock_quantity >= 0)),
    CONSTRAINT product_variants_warranty_nonnegative CHECK ((warranty_months >= 0)),
    CONSTRAINT product_variants_water_nonnegative CHECK ((water_resistance_m >= 0))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid NOT NULL,
    slug character varying(120) NOT NULL,
    name character varying(200) NOT NULL,
    brand character varying(100) NOT NULL,
    category character varying(100) NOT NULL,
    description text NOT NULL,
    image_urls text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status public."CatalogStatus" DEFAULT 'DRAFT'::public."CatalogStatus" NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    data_kind character varying(16) DEFAULT 'DEMO'::character varying NOT NULL,
    source_name character varying(120),
    source_url text,
    source_checked_at timestamp(3) with time zone,
    image_source_url text,
    CONSTRAINT products_data_kind_check CHECK (((data_kind)::text = ANY (ARRAY[('DEMO'::character varying)::text, ('REFERENCE'::character varying)::text])))
);


--
-- Name: promotion_uses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_uses (
    id uuid NOT NULL,
    promotion_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id uuid NOT NULL,
    code character varying(32) NOT NULL,
    amount_vnd integer NOT NULL,
    min_subtotal_vnd integer NOT NULL,
    max_uses integer NOT NULL,
    per_user_limit integer NOT NULL,
    starts_at timestamp(3) with time zone NOT NULL,
    ends_at timestamp(3) with time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT promotion_bounds CHECK (((amount_vnd > 0) AND (min_subtotal_vnd >= 0) AND (max_uses > 0) AND (per_user_limit > 0) AND (ends_at > starts_at)))
);


--
-- Name: saved_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_addresses (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    label character varying(40) NOT NULL,
    recipient_name character varying(80) NOT NULL,
    phone character varying(16) NOT NULL,
    address character varying(500) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    order_item_id uuid,
    kind character varying(16) NOT NULL,
    subject character varying(120) NOT NULL,
    status character varying(16) DEFAULT 'OPEN'::character varying NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT ticket_values CHECK ((((kind)::text = ANY (ARRAY[('GENERAL'::character varying)::text, ('ORDER'::character varying)::text, ('WARRANTY'::character varying)::text])) AND ((status)::text = ANY (ARRAY[('OPEN'::character varying)::text, ('IN_REVIEW'::character varying)::text, ('RESOLVED'::character varying)::text, ('REJECTED'::character varying)::text]))))
);


--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_messages (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    author_name character varying(80) NOT NULL,
    author_role character varying(16) NOT NULL,
    body character varying(2000) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone NOT NULL,
    revoked_at timestamp(3) with time zone,
    CONSTRAINT user_sessions_valid_expiry CHECK ((expires_at > created_at))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(254) NOT NULL,
    display_name character varying(80) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public."UserRole" DEFAULT 'CUSTOMER'::public."UserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp(3) with time zone,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT users_email_normalized CHECK (((email)::text = lower(btrim((email)::text)))),
    CONSTRAINT users_failed_attempts_range CHECK (((failed_login_attempts >= 0) AND (failed_login_attempts <= 5)))
);


--
-- Name: TinNhan maTinNhan; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TinNhan" ALTER COLUMN "maTinNhan" SET DEFAULT nextval('public."TinNhan_maTinNhan_seq"'::regclass);


--
-- Name: HoiThoai HoiThoai_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HoiThoai"
    ADD CONSTRAINT "HoiThoai_pkey" PRIMARY KEY ("maHoiThoai");


--
-- Name: TinNhan TinNhan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TinNhan"
    ADD CONSTRAINT "TinNhan_pkey" PRIMARY KEY ("maTinNhan");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: auth_rate_buckets auth_rate_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_rate_buckets
    ADD CONSTRAINT auth_rate_buckets_pkey PRIMARY KEY (key_hash);


--
-- Name: business_audits business_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_audits
    ADD CONSTRAINT business_audits_pkey PRIMARY KEY (id);


--
-- Name: cart_lines cart_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_lines
    ADD CONSTRAINT cart_lines_pkey PRIMARY KEY (user_id, variant_id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, product_id);


--
-- Name: order_events order_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT order_events_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: promotion_uses promotion_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_uses
    ADD CONSTRAINT promotion_uses_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: saved_addresses saved_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_addresses
    ADD CONSTRAINT saved_addresses_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: ticket_messages ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: HoiThoai_guestTokenHash_ngayCapNhat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HoiThoai_guestTokenHash_ngayCapNhat_idx" ON public."HoiThoai" USING btree ("guestTokenHash", "ngayCapNhat");


--
-- Name: HoiThoai_maTK_ngayCapNhat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HoiThoai_maTK_ngayCapNhat_idx" ON public."HoiThoai" USING btree ("maTK", "ngayCapNhat");


--
-- Name: TinNhan_maHoiThoai_maTinNhan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TinNhan_maHoiThoai_maTinNhan_idx" ON public."TinNhan" USING btree ("maHoiThoai", "maTinNhan");


--
-- Name: TinNhan_maHoiThoai_requestId_nguoiGui_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TinNhan_maHoiThoai_requestId_nguoiGui_key" ON public."TinNhan" USING btree ("maHoiThoai", "requestId", "nguoiGui");


--
-- Name: audit_events_target_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_target_user_id_created_at_idx ON public.audit_events USING btree (target_user_id, created_at);


--
-- Name: auth_rate_buckets_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_rate_buckets_expires_at_idx ON public.auth_rate_buckets USING btree (expires_at);


--
-- Name: business_audits_created_at_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_audits_created_at_id_idx ON public.business_audits USING btree (created_at, id);


--
-- Name: order_events_order_id_created_at_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_events_order_id_created_at_id_idx ON public.order_events USING btree (order_id, created_at, id);


--
-- Name: order_items_order_id_variant_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX order_items_order_id_variant_id_key ON public.order_items USING btree (order_id, variant_id);


--
-- Name: orders_archive_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_archive_status_created_idx ON public.orders USING btree (archived_at, status, created_at, id);


--
-- Name: orders_status_created_at_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_status_created_at_id_idx ON public.orders USING btree (status, created_at, id);


--
-- Name: orders_user_id_created_at_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_user_id_created_at_id_idx ON public.orders USING btree (user_id, created_at, id);


--
-- Name: orders_user_id_idempotency_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_user_id_idempotency_key_key ON public.orders USING btree (user_id, idempotency_key);


--
-- Name: password_reset_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX password_reset_tokens_token_hash_key ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: password_reset_tokens_user_id_consumed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_tokens_user_id_consumed_at_idx ON public.password_reset_tokens USING btree (user_id, consumed_at);


--
-- Name: product_reviews_product_id_hidden_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_reviews_product_id_hidden_created_at_idx ON public.product_reviews USING btree (product_id, hidden, created_at);


--
-- Name: product_reviews_user_id_product_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_reviews_user_id_product_id_key ON public.product_reviews USING btree (user_id, product_id);


--
-- Name: product_variants_product_id_status_price_vnd_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_variants_product_id_status_price_vnd_idx ON public.product_variants USING btree (product_id, status, price_vnd);


--
-- Name: product_variants_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_variants_sku_key ON public.product_variants USING btree (sku);


--
-- Name: products_data_kind_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_data_kind_status_idx ON public.products USING btree (data_kind, status);


--
-- Name: products_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_slug_key ON public.products USING btree (slug);


--
-- Name: products_status_created_at_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_status_created_at_id_idx ON public.products USING btree (status, created_at, id);


--
-- Name: promotion_uses_order_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX promotion_uses_order_id_key ON public.promotion_uses USING btree (order_id);


--
-- Name: promotion_uses_promotion_id_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotion_uses_promotion_id_user_id_idx ON public.promotion_uses USING btree (promotion_id, user_id);


--
-- Name: promotions_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX promotions_code_key ON public.promotions USING btree (code);


--
-- Name: saved_addresses_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saved_addresses_user_id_created_at_idx ON public.saved_addresses USING btree (user_id, created_at);


--
-- Name: support_tickets_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_status_created_at_idx ON public.support_tickets USING btree (status, created_at);


--
-- Name: support_tickets_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_user_id_created_at_idx ON public.support_tickets USING btree (user_id, created_at);


--
-- Name: ticket_messages_ticket_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_messages_ticket_id_created_at_idx ON public.ticket_messages USING btree (ticket_id, created_at);


--
-- Name: user_sessions_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_sessions_token_hash_key ON public.user_sessions USING btree (token_hash);


--
-- Name: user_sessions_user_id_revoked_at_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_user_id_revoked_at_expires_at_idx ON public.user_sessions USING btree (user_id, revoked_at, expires_at);


--
-- Name: users_created_at_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_created_at_id_idx ON public.users USING btree (created_at, id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: HoiThoai HoiThoai_maTK_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HoiThoai"
    ADD CONSTRAINT "HoiThoai_maTK_fkey" FOREIGN KEY ("maTK") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TinNhan TinNhan_maHoiThoai_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TinNhan"
    ADD CONSTRAINT "TinNhan_maHoiThoai_fkey" FOREIGN KEY ("maHoiThoai") REFERENCES public."HoiThoai"("maHoiThoai") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_events audit_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: audit_events audit_events_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_audits business_audits_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_audits
    ADD CONSTRAINT business_audits_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cart_lines cart_lines_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_lines
    ADD CONSTRAINT cart_lines_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_lines cart_lines_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_lines
    ADD CONSTRAINT cart_lines_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: favorites favorites_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_events order_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT order_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_events order_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT order_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_reviews product_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: promotion_uses promotion_uses_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_uses
    ADD CONSTRAINT promotion_uses_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promotion_uses promotion_uses_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_uses
    ADD CONSTRAINT promotion_uses_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: promotion_uses promotion_uses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_uses
    ADD CONSTRAINT promotion_uses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: saved_addresses saved_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_addresses
    ADD CONSTRAINT saved_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_messages ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--


