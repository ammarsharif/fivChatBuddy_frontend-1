import React, { useEffect, useState, useRef } from 'react';
import { getAuthToken } from './background';
import { RiQuestionMark } from 'react-icons/ri';
import { MdOutlineFeedback } from 'react-icons/md';
import './stylesApp.css';
import FeedbackModel from './FeedbackModel'; // Import FeedbackModel
import HelpModel from './HelpModel';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [responseText, setResponseText] = useState(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const useRefState = useRef(false);

  useEffect(() => {
    useRefState.current = true;
    if (!authenticated) {
      generateResponse();
    }
    return () => {
      useRefState.current = false;
    };
  }, []);

  const generateResponse = async () => {
    try {
      const token = await getAuthToken();
      setLoading(true);
      const response = await fetchProfileInfo(token);
      if (useRefState.current) {
        setAuthenticated(true);
        setResponseText(response.photos?.[0]?.url || 'default-photo-url');
      }
    } catch (error) {
      if (useRefState.current) {
        setAuthenticated(false);
      }
      console.error('Error fetching profile info:', error);
    } finally {
      if (useRefState.current) {
        setLoading(false);
      }
    }
  };

  const fetchProfileInfo = async (token: string | undefined) => {
    const response = await fetch(
      'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  };

  const onProfileHandler = async () => {
    try {
      const token = await getAuthToken();
      const tabs = await chrome?.tabs?.query({
        active: true,
        currentWindow: true,
      });
      if (Array.isArray(tabs) && tabs.length > 0) {
        const activeTab = tabs[0];
        const fiverrPattern = /^https:\/\/www\.fiverr\.com\/.*$/;
        if (activeTab.url && fiverrPattern.test(activeTab.url)) {
          chrome.tabs.sendMessage(activeTab.id || 0, '');
          setTimeout(() => {
            chrome.tabs.sendMessage(activeTab.id || 0, {
              action: 'openUserProfile',
              token: token,
            });
          }, 300);
        } else {
          const newUrl = chrome.runtime.getURL('tabInfoModel.html');
          chrome.tabs.create({ url: newUrl }, (newTab) => {
            chrome.tabs.onUpdated.addListener(function listener(
              tabId,
              changeInfo
            ) {
              if (tabId === newTab?.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                chrome.tabs.sendMessage(tabId, {
                  action: 'showUserProfile',
                  token: token,
                });
              }
            });
          });
        }
      } else {
        console.error('No active tab found');
      }
    } catch (error) {
      console.error('Error getting auth token or querying tabs: ', error);
    }
  };

  const onGoogleButtonHandler = () => {
    generateResponse();
  };

  const deleteTokenHandler = async () => {
    try {
      const token = await getAuthToken(false);
      if (token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        chrome.identity.removeCachedAuthToken({ token }, () => {
          setAuthenticated(false);
          setResponseText(null);
          console.log('Token revoked and deleted');
        });
      } else {
        console.log('No token found.');
      }
    } catch (error) {
      console.error('Error revoking token:', error);
    }
  };

  const handleComponentToggle = (component: string) => {
    setActiveComponent((prevComponent) =>
      prevComponent === component ? null : component
    );
  };

  return (
    <div className="container">
      {loading ? (
        <div className="spinner"></div>
      ) : (
        <>
          <div className="header">
            <div className="logo-header">
              <img
                src="https://logos-world.net/wp-content/uploads/2020/12/Fiverr-Logo.png"
                width={'43px'}
                height={'24px'}
                style={{ borderRadius: '50%' }}
                alt="EvolveBay Logo"
              />
              <p className="heading">Fiverr</p>
            </div>
            {authenticated ? (
              <img
                src={responseText || 'default-photo-url'}
                alt="Profile"
                className="user-pic"
                onClick={onProfileHandler}
              />
            ) : (
              <button onClick={onGoogleButtonHandler} className="google-button">
                <img
                  src="https://www.freepnglogos.com/uploads/google-logo-png/google-logo-png-webinar-optimizing-for-success-google-business-webinar-13.png"
                  alt="Google Logo"
                  className="google-logo"
                />
                Login
              </button>
            )}
          </div>
          <hr className="head-divider" />
          {authenticated ? (
            <div>
              <div className="table-container">
                <div className="table-row">
                  <button
                    className="table-cell"
                    onClick={() => handleComponentToggle('help')}
                  >
                    <span role="img" aria-label="help" className="icon">
                      <RiQuestionMark />
                    </span>
                    Need Help
                  </button>
                </div>
                <div className="table-row">
                  <button
                    className="table-cell"
                    onClick={() => handleComponentToggle('feedback')}
                  >
                    <span role="img" aria-label="feedback" className="icon">
                      <MdOutlineFeedback />
                    </span>
                    Provide Feedback
                  </button>
                </div>
              </div>
              {activeComponent === 'help' && (
                <HelpModel onClose={() => handleComponentToggle('help')} />
              )}
              {activeComponent === 'feedback' && (
                <FeedbackModel
                  onClose={() => handleComponentToggle('feedback')}
                />
              )}
              <button onClick={deleteTokenHandler} className="logout-button">
                Logout
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default App;
