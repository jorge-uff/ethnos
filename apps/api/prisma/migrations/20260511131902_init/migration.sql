-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "PlayerColor" AS ENUM ('WHITE', 'BLACK', 'BLUE', 'YELLOW', 'GREEN', 'PURPLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "age" INTEGER NOT NULL DEFAULT 1,
    "activeTribes" TEXT[],
    "deckState" JSONB NOT NULL,
    "marketState" JSONB NOT NULL,
    "kingdomState" JSONB NOT NULL,
    "giantToken" JSONB,
    "dragonsRevealed" INTEGER NOT NULL DEFAULT 0,
    "totalAges" INTEGER NOT NULL DEFAULT 3,
    "activePlayerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "color" "PlayerColor" NOT NULL,
    "glory" INTEGER NOT NULL DEFAULT 0,
    "handState" JSONB NOT NULL,
    "bandsState" JSONB NOT NULL,
    "orcHorde" JSONB NOT NULL DEFAULT '{}',
    "merfolkPosition" INTEGER NOT NULL DEFAULT 0,
    "trollTokens" INTEGER[],
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_userId_key" ON "Player"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_color_key" ON "Player"("gameId", "color");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
