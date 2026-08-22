-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "path" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_day_idx" ON "PageView"("day");

-- CreateIndex
CREATE UNIQUE INDEX "PageView_day_path_key" ON "PageView"("day", "path");

