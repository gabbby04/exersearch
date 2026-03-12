import React, { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

export default function Trial() {
  const objectRef = useRef(null);
  const spinningRef = useRef(false);
  const pulseTween = useRef(null);

  const depthLayers = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);

  useEffect(() => {
    startPulse();
  }, []);

  const startPulse = () => {
    pulseTween.current = gsap.to(objectRef.current, {
      scale: 1.035,
      duration: 1.2,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      force3D: true
    });
  };

  const stopPulse = () => {
    if (pulseTween.current) {
      pulseTween.current.kill();
      pulseTween.current = null;
    }
  };

  const triggerSpin = () => {
    if (spinningRef.current) return;

    spinningRef.current = true;
    stopPulse();

    gsap.fromTo(
      objectRef.current,
      {
        rotateX: -10,
        rotateY: 0,
        scale: 1
      },
      {
        rotateX: -10,
        rotateY: 360,
        scale: 1,
        duration: 0.9,
        ease: "power2.inOut",
        force3D: true,
        onComplete: () => {
          gsap.set(objectRef.current, {
            rotateX: -10,
            rotateY: 0,
            scale: 1
          });

          spinningRef.current = false;
          startPulse();
        }
      }
    );
  };

  return (
    <>
      <style>{`
        html,body,#root{
          margin:0;
          width:100%;
          height:100%;
          overflow:hidden;
        }

        body{
          background:
            radial-gradient(circle at center,#1a1a1a 0%,#080808 45%,#000 100%);
          font-family:Arial,sans-serif;
        }

        .page{
          width:100%;
          height:100%;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .scene{
          perspective:1600px;
        }

        .object{
          position:relative;
          width:min(34vw,340px);
          aspect-ratio:1/1;
          cursor:pointer;
          transform-style:preserve-3d;
          transform:rotateX(-10deg);
          will-change:transform;
        }

        .layer{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          object-fit:contain;
          pointer-events:none;
          transform-style:preserve-3d;
          backface-visibility:hidden;
          -webkit-backface-visibility:hidden;
        }

        .frontFace{
          filter:
            drop-shadow(0 16px 26px rgba(0,0,0,.5))
            drop-shadow(0 0 28px rgba(255,120,0,.18));
        }

        .backFace{
          filter:brightness(.95);
        }

        .ground{
          position:absolute;
          left:50%;
          bottom:-18px;
          width:58%;
          height:28px;
          transform:translateX(-50%) rotateX(86deg) translateZ(-36px);
          border-radius:999px;
          background:radial-gradient(
            ellipse at center,
            rgba(255,120,0,.22) 0%,
            rgba(0,0,0,.25) 45%,
            rgba(0,0,0,0) 78%
          );
          filter:blur(10px);
        }

        .hint{
          position:fixed;
          bottom:20px;
          left:50%;
          transform:translateX(-50%);
          color:rgba(255,255,255,.7);
          font-size:14px;
        }

        @media(max-width:768px){
          .object{
            width:min(70vw,300px);
          }
        }
      `}</style>

      <div className="page">
        <div className="scene">
          <div
            ref={objectRef}
            className="object"
            onClick={triggerSpin}
            title="Click to spin"
          >
            <div className="ground" />

            {depthLayers.map((i) => {
              const z = -(depthLayers.length - i) * 1.4;
              const x = i * 0.28;
              const y = i * 0.12;
              const shade = 0.22 + i * 0.035;

              return (
                <React.Fragment key={i}>
                  <img
                    src="/letterlogo.png"
                    alt=""
                    className="layer"
                    style={{
                      transform:`translateZ(${z}px) translateX(${x}px) translateY(${y}px)`,
                      opacity:.9,
                      filter:`brightness(${shade})`
                    }}
                  />

                  <img
                    src="/letterlogo.png"
                    alt=""
                    className="layer"
                    style={{
                      transform:`rotateY(180deg) translateZ(${z}px) translateX(${-x}px) translateY(${y}px)`,
                      opacity:.25,
                      filter:`brightness(${shade-0.08})`
                    }}
                  />
                </React.Fragment>
              );
            })}

            <img
              src="/letterlogo.png"
              alt="front"
              className="layer frontFace"
              style={{ transform:"translateZ(10px)" }}
            />

            <img
              src="/letterlogo.png"
              alt="back"
              className="layer backFace"
              style={{ transform:"rotateY(180deg) translateZ(10px)" }}
            />
          </div>
        </div>
      </div>

      <div className="hint">Click the logo</div>
    </>
  );
}