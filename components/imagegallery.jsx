/*import React, { useState } from "react";

const images = ["img1.jpeg", "img2.jpeg", "img3.jpeg"];

function Gallery() {
    const [index, setIndex] = useState(0);
    const [zoom, setZoom] = useState(false);
    const [startX, setStartX] = useState(0);

    function touchStart(e) {
        setStartX(e.touches[0].clientX);
    }

    function touchEnd(e) {
        const endX = e.changedTouches[0].clientX;

        if (startX - endX > 50 && index < images.length - 1) {
            setIndex(prev => prev + 1);
        } 
        else if (endX - startX > 50 && index > 0) {
            setIndex(prev => prev - 1);
        }
    }

    return (
        <div>
            <div
                onMouseEnter={() => setZoom(true)}
                onMouseLeave={() => setZoom(false)}
                onTouchStart={touchStart}
                onTouchEnd={touchEnd}
            >
                <img
                    src={images[index]}
                    style={{
                        transform: zoom ? "scale(2)" : "scale(1)"
                    }}
                />
            </div>

            {images.map((image, i) => (
                <img
                    key={i}
                    src={image}
                    style={{
                        border:
                            index === i
                                ? "solid 2px blue"
                                : "solid 2px black"
                    }}
                />
            ))}
        </div>
    );
}

export default Gallery;*/

import React,{useState} from "react"

const images = ["img1.jpeg", "img2.jpeg", "img3.jpeg"];
function Gallery()
{
    const [zoom,setZoom]=useState(false)
   const [startX,setStartX]=useState(0)
   const [page,setPage]=useState(0)
   function touchStart(e)
   {
        setStartX(e.touches[0].clientX)
   }
   function touchEnd(e)
   {
           const endX=e.changedTouches[0].clientX
           if(startX-endX>50 && page<images.length-1)
           {
            setPage(prev=>prev+1)
           }
           if(endX-startX>50 && page>0)
           {
            setPage(prev=>prev+1)
           }
   }
   return (
    <div>
        <div onMouseEnter={()=>setZoom(true)} onMouseLeave={()=>setZoom(false)} onTouchStart={touchStart} onTouchEnd={touchEnd}>
         <img src={images[page]} style={{transform:zoom?"scale(2)":"scale(1)"}} />
        </div>
        {images.map((image,index)=>{
            <img key={index}  src={image} style={{border:page===index?"solid 2px blue":"solid 2px black"}}/>
        })}
    </div>
   )
}