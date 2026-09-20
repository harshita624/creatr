import React,{useEffect} from "react"

function Modal({isOpen,onClose,children,title})
{
  useEffect(()=>{
      function handleKey(e)
      {
        if(e.key==="Escape")
        {
          onClose()
        }
       
      }
       if(isOpen)
        {
          window.addEventListener("keydown",handleKey)
          document.body.style.overflow="hidden"
        } 
        if(!isOpen)return null
        return()=>{window.removeEventListener("keydown",handleKey)}
       
  },[isOpen,onClose])
  return(
    <div onClick={onClose} >
      <div onClick={(e)=>e.stopPropagation()} >
        <p>{title}</p>
        {children}
        <button oClick={onClose} ></button>
      </div>

    </div>
  )
}