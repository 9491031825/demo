import { useState } from 'react';
import CustomerSearch from './CustomerSearch';
import NewCustomerForm from './NewCustomerForm';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('existing');

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('existing')}
                className={`${
                  activeTab === 'existing'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
              >
                Existing Customers
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`${
                  activeTab === 'new'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
              >
                New Customer
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'existing' ? (
              <CustomerSearch />
            ) : (
              <NewCustomerForm />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}