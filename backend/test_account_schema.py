import unittest

from app import create_app


class AccountSchemaStartupTest(unittest.TestCase):
    def test_create_app_initializes_default_account_when_tables_are_missing(self):
        app = create_app(test_config={
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        })

        with app.app_context():
            from app.models import UserAccount

            account = UserAccount.query.filter_by(username='rael').first()
            self.assertIsNotNone(account)
            self.assertEqual(account.display_name, 'Rael')


if __name__ == '__main__':
    unittest.main()
