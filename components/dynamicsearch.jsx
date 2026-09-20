import React,{useState,useEffect,useRef} from "react"

function Autocomplete()
{
    const [query,setQuery]=useState("")
    const [loading,setLoading]=useState(false)
    const [results,setResults]=useState([])

    const cache=useRef({})
    useEffect(()=>{
           if(query=="")
           {
            setResults([])
            return
           }

           if(cache.current[query])
           {
            setResults(cache.current[query])
            return
           }
           const controller=new AbortController()
           const timer=setTimeout(async()=>{
            setLoading(true)
            try{

                
                const res=await fetch(`https://dummyjson.com/products/search?q=${query}`,{signal:controller.signal})
                const data=await res.json()
                const products=data.products
                setResults(products)
                cache.current[query]=products
            }catch(err)
            {
                console.log(err)

            }finally{
                setLoading(false)
            }
           },300)
           return()=>{
            setTimeout(timer)
            controller.abort()
           }
    },[query])
    return(
        <div>
            <input type="text" value={query} onChange={(e)=>setQuery(e.target.value)} />
            {results.map((item)=>{
                <div key={item.id}>
                <h2>{item.title}</h2>
                <p>{item.content}</p>
                </div>
            })}
        </div>
    )
}