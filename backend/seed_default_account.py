from app import create_app, ensure_default_account


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        ensure_default_account()
        print('Seeded default account: rael / zara')
