import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

const SetupArunendu: React.FC = () => {
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const createArunendusAccount = async () => {
    setIsLoading(true);
    setStatus("Creating Arunendu's account...");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: 'arunendu.mazumder@maigon.io',
        password: 'Admin2024!Mx9',
        options: {
          data: {
            first_name: 'Arunendu',
            last_name: 'Mazumder',
            company: 'Maigon',
            phone: '+4748629416',
            company_size: '11-50',
            country_region: 'se',
            industry: 'legal',
          }
        }
      });

      if (error) {
        console.error('Error creating Arunendu account:', error);
        setStatus(`Error: ${error.message}`);
      } else {
        console.log('Arunendu account created:', data);
        setStatus(`✅ Success! Account created for ${data.user?.email}`);
        
        // Auto-confirm email for testing
        if (data.user?.id) {
          // Note: This would need admin privileges to work
          setStatus(prev => prev + "\n⏳ Confirming email...");
        }
      }
    } catch (error: any) {
      console.error('Error creating Arunendu account:', error);
      setStatus(`❌ Unexpected error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Setup Arunendu Account</h3>
      <button
        onClick={createArunendusAccount}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Creating..." : "Create Arunendu Account"}
      </button>
      {status && (
        <div className="mt-4 p-3 bg-white border rounded">
          <pre className="text-sm whitespace-pre-wrap">{status}</pre>
        </div>
      )}
    </div>
  );
};

export default SetupArunendu;
