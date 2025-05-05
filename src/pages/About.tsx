import React from 'react';

export function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg px-8 py-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Restaurant Map Application</h1>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Abstract</h2>
            <p className="text-gray-600 leading-relaxed space-y-4">
              The Restaurant Map Application is an innovative web-based platform that revolutionizes 
              the way users discover and interact with restaurants in their vicinity. This application 
              seamlessly integrates modern geospatial technology with an intuitive user interface, 
              providing real-time location-based restaurant discovery services.
            </p>
            
            <div className="mt-6 space-y-4">
              <p className="text-gray-600">
                The system leverages advanced technologies including:
              </p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>React for dynamic user interfaces</li>
                <li>PostGIS for sophisticated spatial queries</li>
                <li>Supabase for secure authentication and real-time data management</li>
                <li>OpenLayers for interactive mapping capabilities</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">System Flow Chart</h2>
            <div className="bg-gray-50 p-6 rounded-lg overflow-x-auto">
              <img
                src="https://res.cloudinary.com/djvf2vnbp/image/upload/v1709634774/restaurant-map-flow_nqgvht.png"
                alt="Restaurant Map Application Flow Chart"
                className="mx-auto max-w-full"
              />
              <p className="text-sm text-gray-500 mt-4 text-center">
                System Flow Chart showing the main processes and data flow
              </p>
            </div>
            
            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Flow Description</h3>
              <div className="space-y-4 text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-800">1. User Authentication</h4>
                  <p>Users begin by either logging in or registering. The system validates credentials and establishes a secure session.</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">2. Location Services</h4>
                  <p>The application requests user location access and initializes the map centered on the user's position.</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">3. Restaurant Discovery</h4>
                  <p>Users can discover restaurants through:
                    <ul className="list-disc pl-6 mt-2">
                      <li>Proximity-based search</li>
                      <li>Manual map exploration</li>
                      <li>Search functionality</li>
                    </ul>
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">4. Restaurant Management</h4>
                  <p>Restaurant owners can:
                    <ul className="list-disc pl-6 mt-2">
                      <li>Register new restaurants</li>
                      <li>Update restaurant information</li>
                      <li>Manage restaurant profiles</li>
                    </ul>
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">5. Navigation Services</h4>
                  <p>Users can:
                    <ul className="list-disc pl-6 mt-2">
                      <li>Get directions to restaurants</li>
                      <li>View estimated travel times</li>
                      <li>Choose between walking and driving modes</li>
                    </ul>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Technical Implementation</h2>
            <p className="text-gray-600 leading-relaxed">
              Built using a modern tech stack, the application implements spatial data management through 
              PostGIS, real-time updates via Supabase, and an interactive map interface using OpenLayers. 
              The frontend utilizes React with TypeScript for type safety and Tailwind CSS for responsive 
              design, ensuring a seamless user experience across devices.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}