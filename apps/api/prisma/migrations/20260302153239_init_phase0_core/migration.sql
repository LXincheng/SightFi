-- CreateEnum
CREATE TYPE "Market" AS ENUM ('US', 'HK', 'ETF');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'HKD', 'CNY');

-- CreateEnum
CREATE TYPE "TransactionSide" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'FEE');

-- CreateEnum
CREATE TYPE "MemoryCategory" AS ENUM ('RISK_PROFILE', 'STRATEGY_NOTE', 'LESSON_LEARNED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "quoteCurrency" "Currency" NOT NULL,
    "transactionAt" TIMESTAMP(3) NOT NULL,
    "side" "TransactionSide" NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "unitPrice" DECIMAL(20,6) NOT NULL,
    "fee" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "base" "Currency" NOT NULL,
    "quote" "Currency" NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "portfolios_userId_idx" ON "portfolios"("userId");

-- CreateIndex
CREATE INDEX "transactions_portfolioId_transactionAt_idx" ON "transactions"("portfolioId", "transactionAt");

-- CreateIndex
CREATE INDEX "transactions_symbol_market_idx" ON "transactions"("symbol", "market");

-- CreateIndex
CREATE INDEX "user_memories_category_idx" ON "user_memories"("category");

-- CreateIndex
CREATE UNIQUE INDEX "user_memories_userId_key_key" ON "user_memories"("userId", "key");

-- CreateIndex
CREATE INDEX "fx_rates_base_quote_asOf_idx" ON "fx_rates"("base", "quote", "asOf" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_base_quote_asOf_source_key" ON "fx_rates"("base", "quote", "asOf", "source");

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
