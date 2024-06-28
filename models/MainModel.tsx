import React, { ChangeEvent, useEffect, useState, useRef } from 'react';
import { RxCross1 } from 'react-icons/rx';
import { FaRegPaste } from 'react-icons/fa6';
import { TbReload } from 'react-icons/tb';
import '../styles/stylesMainModel.css';
import { getUserInfo } from '../utils/auth';

const MainModel: React.FC = () => {
  const [responseText, setResponseText] = useState<{ text: string }[] | null>(
    null
  );
  const [selectedTone, setSelectedTone] = useState<string>('formal');
  const [selectedRole, setSelectedRole] = useState<string>('seller');
  const [loading, setLoading] = useState<boolean>(true);
  const user = getUserInfo();
  const useRefState = useRef(false);

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'receiveEmailText') {
        const emailText = `Act as a content creator consultant. I am a ${selectedRole} dealing with ${
          selectedRole === 'seller' ? 'buyer' : 'seller'
        } efficiently and attractively in a formal tone.\nHere is the message:\n${
          message?.response
        }\nYour task:\nHelp the ${selectedRole} respond to the last message from the ${
          selectedRole === 'seller' ? 'buyer' : 'seller'
        }.\nThe response should be short (no more than 25 words) and perfectly suited to the situation.Do not include extra lines like "here is your text" or any greetings or brackets (e.g., [seller]).Provide only one response in a formal tone.Please generate the response now.`;
        const modifiedEmailText = emailText?.replace('formal', selectedTone);
        if (modifiedEmailText && modifiedEmailText.includes(selectedTone)) {
          generateResponse(modifiedEmailText);
          useRefState.current = true;
        }
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [selectedTone, selectedRole]);

  const updateProfileApiCalls = async (increment: number) => {
    try {
      await fetch(`http://localhost:5000/api/profile/updateApiCount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id, increment }),
      });
    } catch (error) {
      console.error('Failed to update API calls:', error);
    }
  };

  const updatePlanApiCounts = async (increment: number) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/subscription/updateApiCount`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user?.id, increment }),
        }
      );
      const data = await response.json();

      console.log(data, 'DATA FROM UPDATE API:::::');
      if (!data.ok) {
        throw new Error(data.message || 'Failed to update API calls');
      }
      return data;
    } catch (error) {
      console.error('Failed to update API calls:', error);
    }
  };

  const handleToneChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    setLoading(true);
    const tone = event.target.value;
    setSelectedTone(tone);
    useRefState.current = false;
    chrome.runtime.sendMessage({ action: 'executeOnClicker' });
  };

  const handleRoleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    setLoading(true);
    const role = event.target.value;
    setSelectedRole(role);
    useRefState.current = false;
    chrome.runtime.sendMessage({ action: 'executeOnClicker' });
  };

  const handleReloadClick = async () => {
    setLoading(true);
    useRefState.current = false;
    chrome.runtime.sendMessage({
      action: 'executeOnClicker',
      selectedTone: selectedTone,
      selectedRole: selectedRole,
    });
  };

  const generateResponse = async (modifiedEmailText: string) => {
    try {
      setLoading(true);
      const updateApiCountResponse = await updatePlanApiCounts(3);
      if (!updateApiCountResponse?.ok) {
        setResponseText([
          { text: 'Please update your plan to continue using the service.' },
        ]);
        setLoading(false);
        return;
      }
      await updateProfileApiCalls(3);
      const fetchResponse = async () => {
        const response = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization:
                'Bearer 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',
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: modifiedEmailText }],
              model: 'gryphe/mythomist-7b:free',
            }),
          }
        );
        const dataJson = await response.json();
        const choice = dataJson.choices[0];
        const responseContent = choice?.message.content;
        return responseContent ? { text: responseContent } : null;
      };
      const responses = await Promise.all([
        fetchResponse(),
        fetchResponse(),
        fetchResponse(),
      ]);
      const validResponses = responses.filter(
        (response) => response !== null
      ) as { text: string }[];

      if (validResponses.length === 3) {
        setResponseText(validResponses);
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error:', error);
      await updatePlanApiCounts(-3);
      await updateProfileApiCalls(-3);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleResponseClick = (response: string) => {
    if (response !== undefined) {
      chrome.runtime.sendMessage({
        action: 'suggestedText',
        suggestion: response,
      });
      console.log(response);
    }
  };

  const handleCloseButton = () => {
    useRefState.current = false;
    chrome.runtime.sendMessage({ action: 'closeIframe' });
  };

  return (
    <div className="container">
      <div>
        <div className="header">
          <div className="logoHeader">
            <img
              src="icons/logo_white.png"
              width="28px"
              height="26px"
              style={{ borderRadius: '50%', marginRight: '1em' }}
              alt="Fiverr Logo"
            ></img>
            <p className="heading">A.I Suggested Replies</p>
          </div>
          <button
            className="closeButton"
            onClick={handleCloseButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1dbf73';
              e.currentTarget.style.borderRadius = '50%';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            <RxCross1 />
          </button>
        </div>
        <hr className="headDivider" />
        <div className="toneHeader">
          <div className="selectContainer">
            <select
              id="toneSelect"
              className="select"
              onChange={handleToneChange}
            >
              <option value="formal">Formal 🧑‍💼</option>
              <option value="apologetic">Apologetic 🙏</option>
              <option value="friendly">Friendly 😊</option>
              <option value="enthusiastic">Enthusiastic 🎉</option>
              <option value="persuasive">Persuasive 🗣️</option>
              <option value="empathetic">Empathetic 🤗</option>
              <option value="assertive">Assertive 💪</option>
              <option value="informative">Informative 📘</option>
              <option value="reassuring">Reassuring 🌟</option>
              <option value="grateful">Grateful 🙌</option>
            </select>
          </div>
          <div className="selectContainer">
            <select
              id="roleSelect"
              className="select"
              onChange={handleRoleChange}
            >
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>
        </div>
        <div>
          {loading ? (
            <div className="spinner"></div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: '10px',
              }}
            >
              {responseText ? (
                responseText.map((response, index) => (
                  <div key={index}>
                    <p
                      className="responseItem"
                      onClick={() => handleResponseClick(response.text)}
                    >
                      {response.text}
                      {!loading ? (
                        <span
                          className="copyIcon"
                          style={{ float: 'right' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResponseClick(response.text);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#d1ffda';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          <FaRegPaste />
                        </span>
                      ) : null}
                    </p>
                    {index < responseText.length - 1 && (
                      <hr className="replyDivider" />
                    )}
                  </div>
                ))
              ) : (
                <p className="noResponse">No response available</p>
              )}
            </div>
          )}
          {!loading ? (
            <button
              className="reloadButton"
              style={{ bottom: responseText ? '-1em' : '1.6em' }}
              onClick={handleReloadClick}
            >
              <TbReload />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MainModel;
