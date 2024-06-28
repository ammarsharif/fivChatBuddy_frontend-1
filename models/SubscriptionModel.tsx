import React, { useEffect, useState } from 'react';
import { IoMdCheckmark } from 'react-icons/io';
import '../styles/stylesSubscriptionModel.css';
import { getUserInfo } from '../utils/auth';
import { getAuthToken } from '../background';

interface Plan {
  _id: string;
  planTitle: string;
  planFeatures: string[];
  planPrice: number;
  planApiCounts: number;
  startDate: string;
}

const SubscriptionModel: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const user = getUserInfo();

  const getSubscriptionPlan = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/subscriptionPlan',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }

      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.log('Failed to fetch subscription plans:', error);
    }
  };

  useEffect(() => {
    getSubscriptionPlan();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const authToken = await getAuthToken();

      try {
        const response = await fetch(
          `http://localhost:5000/api/profile?email=${user?.emailAddress}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setCurrentPlan(data.subscriptionPlan);
        const subscriptionResponse = await fetch(
          `http://localhost:5000/api/subscription/${data._id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!subscriptionResponse.ok) {
          throw new Error('Failed to fetch subscription plan');
        }

        const { subscriptionPlan } = await subscriptionResponse.json();
        setCurrentPlan(subscriptionPlan?.plan);
        setLoading(false);
      } catch (error) {
        console.log('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handlePlanChange = async (planTitle: string) => {
    if (!user?.id) {
      console.log('User data not available');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id, planTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      const result = await response.json();
      setCurrentPlan(result.subscription.plan);
    } catch (error) {
      console.log('Error updating subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="will-be-soon-button">
        {/* <button>Will Be Added Soon</button> */}
      </div>
      <div className="subscription-container">
        {loading ? (
          <div className="spinner"></div>
        ) : (
          plans.map((plan) => (
            <div className="plan" key={plan._id}>
              <h2>
                {plan.planPrice === 0
                  ? 'See magic'
                  : plan.planTitle.charAt(0).toUpperCase() +
                    plan.planTitle.slice(1)}
              </h2>
              <h1>
                {plan.planPrice === 0 ? 'Free' : `$${plan.planPrice}`}
                {plan.planTitle !== 'free' && (
                  <span>
                    {plan.planTitle === 'yearly' ? '/year' : '/month'}
                  </span>
                )}
              </h1>
              {plan.planTitle === 'yearly' ? (
                <div style={{ height: '25px' }}>
                  <p style={{ color: 'black', fontSize: '12px' }}>
                    Billed as $129 / year
                    <br />
                    (Save $170)
                  </p>
                </div>
              ) : (
                <div style={{ height: '25px' }}></div>
              )}

              <p>
                {plan.planTitle === 'free'
                  ? 'Basic Reply suggestions and tone adjustment'
                  : 'Say goodbye to reply limits with our unlimited plan'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {loading ? (
                  <div className="loader"></div>
                ) : (
                  <button
                    className="get-unlimited-button"
                    style={{
                      backgroundColor:
                        currentPlan === plan.planTitle ? 'gray' : '#1dbf73',
                      cursor:
                        currentPlan === plan.planTitle
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                    disabled={currentPlan === plan.planTitle}
                    onClick={() => handlePlanChange(plan.planTitle)}
                  >
                    {currentPlan === plan.planTitle
                      ? 'Current plan'
                      : 'Select Plan'}
                  </button>
                )}
              </div>
              <ul
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  paddingLeft: '20px',
                }}
              >
                {plan.planFeatures.map((feature, index) => (
                  <li
                    key={index}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <IoMdCheckmark style={{ marginRight: '8px' }} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default SubscriptionModel;
