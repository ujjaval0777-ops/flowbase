from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


Role = Literal["OWNER", "ADMIN", "EMPLOYEE"]


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    phone: str | None = Field(default=None, max_length=20)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)


class ShopCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    address: str | None = None


class ShopUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    address: str | None = None


class MemberAddExisting(BaseModel):
    user_id: str
    role: Literal["ADMIN", "EMPLOYEE"] = "EMPLOYEE"
    salary: Decimal | None = Field(default=None, ge=0)


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    phone: str | None = Field(default=None, max_length=20)
    role: Literal["ADMIN", "EMPLOYEE"] = "EMPLOYEE"
    salary: Decimal | None = Field(default=None, ge=0)


class MemberUpdate(BaseModel):
    role: Literal["ADMIN", "EMPLOYEE"]
    salary: Decimal | None = Field(default=None, ge=0)


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    description: str | None = None


class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    description: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=150)
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    description: str | None = None


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category_id: int | None = None
    supplier_id: int | None = None
    selling_price: Decimal = Field(default=Decimal("0"), ge=0)
    purchase_price: Decimal = Field(default=Decimal("0"), ge=0)
    stock_quantity: Decimal = Field(default=Decimal("0"), ge=0)
    low_stock_threshold: Decimal = Field(default=Decimal("5"), ge=0)
    description: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    category_id: int | None = None
    supplier_id: int | None = None
    selling_price: Decimal | None = Field(default=None, ge=0)
    purchase_price: Decimal | None = Field(default=None, ge=0)
    stock_quantity: Decimal | None = Field(default=None, ge=0)
    low_stock_threshold: Decimal | None = Field(default=None, ge=0)
    description: str | None = None


class SaleItemRequest(BaseModel):
    product_id: int
    quantity: Decimal = Field(gt=0)


class SaleCreate(BaseModel):
    shop_id: int
    bill_number: str = Field(min_length=1, max_length=50)
    tax: Decimal = Field(default=Decimal("0"), ge=0)
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    items: list[SaleItemRequest] = Field(min_length=1)


class StockPurchaseItemRequest(BaseModel):
    product_id: int
    quantity: Decimal = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)


class StockPurchaseCreate(BaseModel):
    shop_id: int
    supplier_id: int | None = None
    reference_number: str | None = None
    description: str | None = None
    items: list[StockPurchaseItemRequest] = Field(min_length=1)


class ExpenseCreate(BaseModel):
    shop_id: int
    expense_type: Literal["GENERAL"] = "GENERAL"
    amount: Decimal = Field(gt=0)
    description: str | None = None
    expense_date: date | None = None


class SalaryCreate(BaseModel):
    shop_member_id: int
    amount: Decimal = Field(gt=0)
    salary_month: date


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str | None = None
    email: str | None = None
    phone: str | None = None
