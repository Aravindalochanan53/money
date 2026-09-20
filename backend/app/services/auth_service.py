import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from decimal import Decimal

from app.config import settings
from app.models.user import User
from app.models.business import Business, BankCashBalance
from app.schemas.auth import UserCreate, UserLogin, Token

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        pwd_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        pwd_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @classmethod
    def register_user(cls, db: Session, user_in: UserCreate) -> Token:
        # Check if email exists
        existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )

        # Create Business
        business = Business(
            name=user_in.business_name,
            currency=user_in.currency or "INR",
            safety_cash_threshold=Decimal(str(user_in.safety_cash_threshold or 100000.00))
        )
        db.add(business)
        db.flush()

        # Create Starting Bank Balance
        if user_in.starting_cash is not None:
            balance = BankCashBalance(
                business_id=business.id,
                balance_amount=Decimal(str(user_in.starting_cash)),
                notes="Initial starting cash at registration"
            )
            db.add(balance)

        # Create User
        hashed_pwd = cls.hash_password(user_in.password)
        user = User(
            business_id=business.id,
            email=user_in.email.lower(),
            password_hash=hashed_pwd,
            full_name=user_in.full_name,
            role="OWNER"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.refresh(business)

        token_data = {
            "sub": user.id,
            "business_id": business.id,
            "role": user.role,
            "email": user.email
        }
        token = cls.create_access_token(token_data)

        return Token(
            access_token=token,
            user_id=user.id,
            business_id=business.id,
            business_name=business.name,
            full_name=user.full_name,
            email=user.email,
            role=user.role
        )

    @classmethod
    def login_user(cls, db: Session, credentials: UserLogin) -> Token:
        user = db.query(User).filter(User.email == credentials.email.lower()).first()
        if not user or not cls.verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )

        business = db.query(Business).filter(Business.id == user.business_id).first()
        token_data = {
            "sub": user.id,
            "business_id": user.business_id,
            "role": user.role,
            "email": user.email
        }
        token = cls.create_access_token(token_data)

        return Token(
            access_token=token,
            user_id=user.id,
            business_id=user.business_id,
            business_name=business.name if business else "",
            full_name=user.full_name,
            email=user.email,
            role=user.role
        )
