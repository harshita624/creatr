import React,{useState} from "react"

function Payment()
{
    const [name,setName]=useState("")
    const [address,setAddress]=useState("")
    const [step,setStep]=useState(0)
    const [email,setEmail]=useState("")
    const [password,setPassword]=useState("")
    const [confirm,setConfirm]=useState("")
    const [showPassword,setShowPassword]=useState(false)
    const [cvv,setCvv]=useState("")
    const [error,setError]=useState("")
    const [card,setCard]=useState("")
    function nextStep()
    {
         if(step==0)
         {
            if(name==="")
            {
                 setError("Name is required")
                 return
            }
            if(address==="")
            {
                setError("Address is required")
                return
            }
            if(!email.includes("@"))
            {
                setError("Enter a valid email")
                return
            }
            if(!password.length===8)
            {
                setError("password should br of length 8")
                return
            }
            if(!/[A-Z]/.test(password))
            {
                setError("Password should contain atleast one upper case character")
                return
            }
            if(!/[a-z]/.test(password))
            {
                setError("Password should contain atleast one lower case character")
                return

            }
            if(!/[0-9]/.test(password))
            {
                setError("Password should contain atleast one digit")
                return

            }
            if(password!==confirm)
            {
                setError("Password should match")
                return
            }

         }
         if(step===1)
         {
            if(!/^d{16}$/.test(card))
            {
                setError("Enter valid card number")
                return 
            }
            if(!/^d{3}$/.test(cvv))
            {
                setError("Enter valid cvv")
                return 
            }
            if(expiry==="")
            {
                setError("Enter expiry date")
                return 
            }
         }
         setStep(step+1)
    }
    function prev()
    {
        setError("")
        setStep(step-1)
    }
    function place()
    {
        const order={
            shipping:{
                name,
                address,
                email
            }
        
        }
            console.log(order)
    }
    return (
        <div>
            {step==0 &&(<div>

                <input type="text" placeholder='name' value={name} onChange={(e)=>setName(e.target.value)} />
                <input type={showPassword?"text":"password"} value={password} onChange={(e)=>setPassword(e.target.value)} />
                <button  onClick={()=>setShowPassword(!showPassword)} >{showPassword?"Hide":"Show"}</button>
                <input type={showPassword?"text":"password"} value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
                </div>)}

                {step==1 && (<div>

                </div>)}
             {step>0 &&<button onClick={prev} >Back</button>}
             {step<2 ?(<button onClick={nextStep} >Next</button>):(<button onClick={place} >Place</button>)}
            
        </div>
    )
}