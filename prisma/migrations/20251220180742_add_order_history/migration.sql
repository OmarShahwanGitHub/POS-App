-- CreateTable
CREATE TABLE "OrderHistory" (
    "id" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "status" "OrderStatus" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentId" TEXT,
    "terminalCheckoutId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderHistoryItem" (
    "id" TEXT NOT NULL,
    "orderHistoryId" TEXT NOT NULL,
    "menuItemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderHistoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderHistoryCustomization" (
    "id" TEXT NOT NULL,
    "orderHistoryItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderHistoryCustomization_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderHistoryItem" ADD CONSTRAINT "OrderHistoryItem_orderHistoryId_fkey" FOREIGN KEY ("orderHistoryId") REFERENCES "OrderHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistoryCustomization" ADD CONSTRAINT "OrderHistoryCustomization_orderHistoryItemId_fkey" FOREIGN KEY ("orderHistoryItemId") REFERENCES "OrderHistoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
