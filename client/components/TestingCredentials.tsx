import React from "react";

interface TestingCredentialsProps {
  onCredentialSelect?: (email: string, password: string) => void;
}

const TestingCredentials: React.FC<TestingCredentialsProps> = ({ onCredentialSelect }) => {
  const testAccounts = [
    {
      email: 'mockuser@maigon.io',
      password: 'MockPassword123!',
      name: 'Mock User',
      role: 'Admin'
    },
    {
      email: 'arunendu.mazumder@maigon.io',
      password: 'TestPassword123!',
      name: 'Arunendu Mazumder',
      role: 'Admin'
    },
    {
      email: 'admin@maigon.io',
      password: 'AdminTest123!',
      name: 'Admin User',
      role: 'Admin'
    }
  ];

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-sm font-semibold text-blue-800 mb-3">
        🧪 Testing Credentials (Development Mode)
      </h3>
      <div className="space-y-2">
        {testAccounts.map((account, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
            <div className="text-sm">
              <div className="font-medium text-gray-900">{account.name}</div>
              <div className="text-gray-600">{account.email}</div>
              <div className="text-gray-500 font-mono text-xs">{account.password}</div>
            </div>
            {onCredentialSelect && (
              <button
                onClick={() => onCredentialSelect(account.email, account.password)}
                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
              >
                Use
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-blue-700">
        <strong>Note:</strong> These are mock accounts for testing. The real authentication system is being debugged.
      </div>
    </div>
  );
};

export default TestingCredentials;
