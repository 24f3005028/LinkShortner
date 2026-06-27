import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from link_shortener.database import Base, get_db
from link_shortener.main import app, limiter


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Reset the rate-limit counters so each test starts with a clean slate.
    # Without this, the shared in-memory limiter accumulates counts across
    # all tests and trips the 10/minute create limit partway through the suite.
    limiter.reset()
    test_client = TestClient(app, raise_server_exceptions=True)
    yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    limiter.reset()